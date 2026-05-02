package billing

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
	"github.com/xnzperez/edupay-saas/pkg/database"
)

// ==========================================
// ESTRUCTURAS DE DATOS (DTOs)
// ==========================================

// CreateInstallmentReq define los datos necesarios para asignarle una deuda a un estudiante.
type CreateInstallmentReq struct {
	UserID      string  `json:"user_id"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	DueDate     string  `json:"due_date"` // Formato esperado: YYYY-MM-DD
}

// InstallmentDTO define cómo el frontend verá cada deuda
type InstallmentDTO struct {
	ID          string  `json:"id" db:"id"`
	Description string  `json:"description" db:"description"`
	Amount      float64 `json:"amount" db:"amount"`
	Status      string  `json:"status" db:"status"`     // PENDING, PAID, OVERDUE
	DueDate     string  `json:"due_date" db:"due_date"` // Fecha límite
	CreatedAt   string  `json:"created_at" db:"created_at"`
}

// StudentSearchResult define la estructura de los datos que le enviaremos al Cajero.
type StudentSearchResult struct {
	ID             string  `json:"id" db:"id"`
	FullName       string  `json:"full_name" db:"full_name"`
	Email          string  `json:"email" db:"email"`
	CurrentBalance float64 `json:"current_balance" db:"current_balance"`
}

// ==========================================
// CONTROLADORES DE ESCRITURA (POST / PUT)
// ==========================================

// CreateInstallmentHandler inserta una nueva cuota en estado 'PENDING'.

// @Summary Crear una nueva deuda/cuota
// @Description Permite a un cajero asignar una nueva obligación financiera a un estudiante. Validado contra fechas pasadas.
// @Tags Facturación (Cajeros)
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Param request body CreateInstallmentReq true "Datos de la nueva cuota (Monto, Fecha, Descripción)"
// @Success 201 {object} map[string]interface{} "Cuota generada exitosamente"
// @Failure 400 {object} map[string]interface{} "JSON o fecha inválida"
// @Failure 500 {object} map[string]interface{} "Error interno al procesar transacción RLS"
// @Router /billing/installments [post]
func CreateInstallmentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		var req CreateInstallmentReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "ValidationError",
				"message": "JSON inválido",
			})
		}

		// --- 1. VALIDACIÓN DE FECHA ESTRICTA (UTC) ---
		dueDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "ValidationError",
				"message": "Formato de fecha inválido. Debe ser YYYY-MM-DD",
			})
		}

		// Normalizamos ambas fechas a UTC y cortamos las horas/minutos
		today := time.Now().UTC().Truncate(24 * time.Hour)
		dueDateUTC := dueDate.UTC().Truncate(24 * time.Hour)

		if dueDateUTC.Before(today) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "BusinessLogicError",
				"message": "Operación rechazada. No puedes crear una deuda con fecha de vencimiento en el pasado.",
			})
		}

		var newInstallmentID string

		// Utilizamos nuestra transacción RLS para que la cuota quede asegurada en el Tenant actual.
		err = database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			query := `
                INSERT INTO installments (tenant_id, user_id, description, amount, due_date)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`
			return tx.QueryRow(query, tenantID, req.UserID, req.Description, req.Amount, req.DueDate).Scan(&newInstallmentID)
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "No se pudo crear la cuota",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":        "Cuota generada exitosamente",
			"installment_id": newInstallmentID,
		})
	}
}

// PayInstallmentHandler procesa el pago de una cuota usando el saldo de la billetera del estudiante.

// @Summary Pagar una cuota o deuda
// @Description Descuenta el saldo de la billetera del estudiante para pagar una cuota. Calcula interés de mora dinámico si está vencida.
// @Tags Facturación (Estudiantes)
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Param id path string true "ID de la Cuota (UUID)"
// @Success 200 {object} map[string]interface{} "La cuota ha sido saldada y el registro actualizado"
// @Failure 400 {object} map[string]interface{} "Fondos insuficientes o cuota ya pagada"
// @Failure 408 {object} map[string]interface{} "Tiempo de espera agotado"
// @Router /billing/installments/{id}/pay [post]
func PayInstallmentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		installmentID := c.Params("id")

		// 🛡️ LAYER 1 DEFENSE (FAIL-FAST): Validar formato UUID antes de tocar la BD
		if _, err := uuid.Parse(installmentID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "ValidationError",
				"message": "El ID de la cuota proporcionado no tiene un formato UUID válido",
			})
		}

		tenantID := c.Locals("tenant_id").(string)

		// 🛡️ CONTEXT MANAGEMENT: Propagación de cancelación (Timeouts/Graceful Shutdowns)
		// Extraemos el Context y asignamos un timeout estricto de 5 segundos.
		// Esto previene que una query colgada mantenga ocupado el Pool de Conexiones si el cliente se desconecta.
		ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Second)
		defer cancel()

		// Abrimos una transacción. Si en algún punto el saldo no alcanza o hay un error,
		// TODAS las operaciones se cancelan automáticamente (Rollback).
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {

			// 0. Obtener la tasa de interés de mora del SuperAdmin
			var interestRate float64
			getTenantQuery := `SELECT default_interest_rate FROM tenants WHERE id = $1`
			// Utilizamos GetContext para asociar la query al ciclo de vida de la petición HTTP
			if err := tx.GetContext(ctx, &interestRate, getTenantQuery, tenantID); err != nil {
				return fmt.Errorf("error al obtener configuración financiera: %w", err)
			}

			// 1. Buscar la cuota y bloquearla (FOR UPDATE)
			var installment struct {
				UserID  string    `db:"user_id"`
				Amount  float64   `db:"amount"`
				Status  string    `db:"status"`
				DueDate time.Time `db:"due_date"`
			}

			getInstQuery := `SELECT user_id, amount, status, due_date FROM installments WHERE id = $1 FOR UPDATE`
			if err := tx.GetContext(ctx, &installment, getInstQuery, installmentID); err != nil {
				return fmt.Errorf("cuota no encontrada: %w", err)
			}

			// Validar que la cuota no esté ya pagada (Idempotencia)
			if installment.Status == "PAID" {
				return fmt.Errorf("esta cuota ya fue pagada")
			}

			// --- CÁLCULO DE MORA MATEMÁTICO ---
			totalToPay := installment.Amount
			now := time.Now()
			var penalty float64 = 0

			if now.After(installment.DueDate) {
				duration := now.Sub(installment.DueDate)
				daysDelay := int(math.Ceil(duration.Hours() / 24.0))

				if daysDelay > 0 {
					penalty = installment.Amount * (interestRate * float64(daysDelay))
					totalToPay += penalty
				}
			}

			// 2. Buscar la billetera del usuario y bloquearla (FOR UPDATE)
			var wallet struct {
				ID      string  `db:"id"`
				Balance float64 `db:"current_balance"`
			}

			getWalletQuery := `SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE`
			if err := tx.GetContext(ctx, &wallet, getWalletQuery, installment.UserID); err != nil {
				return fmt.Errorf("billetera no encontrada: %w", err)
			}

			// 3. Verificar si el estudiante tiene suficiente dinero (Validamos contra el total con mora)
			if wallet.Balance < totalToPay {
				return fmt.Errorf("fondos insuficientes para cubrir la cuota y la mora. Se requieren: %.2f", totalToPay)
			}

			// 4. Descontar el dinero de la billetera
			updateWalletQuery := `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`
			if _, err := tx.ExecContext(ctx, updateWalletQuery, totalToPay, wallet.ID); err != nil {
				return fmt.Errorf("error al actualizar billetera: %w", err)
			}

			// 5. Marcar la cuota como pagada
			updateInstQuery := `UPDATE installments SET status = 'PAID' WHERE id = $1`
			if _, err := tx.ExecContext(ctx, updateInstQuery, installmentID); err != nil {
				return fmt.Errorf("error al actualizar cuota: %w", err)
			}

			// 6. Dejar el comprobante en el historial de transacciones
			txLogQuery := `
                INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference)
                VALUES ($1, $2, 'FEE', $3, $4)`

			// Referencia dinámica y transparente para auditoría
			reference := "Pago de cuota: " + installmentID
			if penalty > 0 {
				reference = fmt.Sprintf("Pago de cuota: %s (Incluye Mora: %.2f)", installmentID, penalty)
			}

			if _, err := tx.ExecContext(ctx, txLogQuery, wallet.ID, tenantID, totalToPay, reference); err != nil {
				return fmt.Errorf("error al registrar auditoría: %w", err)
			}

			return nil
		})

		// Manejo de errores controlados o time-outs
		if err != nil {
			// Evaluamos si el error proviene por agotamiento de límite de tiempo del contexto
			if ctx.Err() != nil {
				return c.Status(fiber.StatusRequestTimeout).JSON(fiber.Map{
					"error":   "TimeoutError",
					"message": "La transacción tomó demasiado tiempo y fue cancelada",
					"details": ctx.Err().Error(),
				})
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "PaymentError",
				"message": "El pago fue rechazado",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "La cuota ha sido saldada y el registro actualizado.",
		})
	}
}

// ==========================================
// CONTROLADORES DE LECTURA (GET)
// ==========================================

// SearchStudentsHandler permite al cajero buscar estudiantes por nombre o correo
func SearchStudentsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Validar el término de búsqueda
		searchQuery := c.Query("q")
		if searchQuery == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "ValidationError",
				"message": "Debes proporcionar un término de búsqueda",
			})
		}

		// 2. Extraer el TenantID del middleware para la transacción segura
		tenantID := c.Locals("tenant_id").(string)
		searchTerm := "%" + searchQuery + "%" // Comodines para ILIKE (búsqueda parcial)

		// Inicializamos el slice para asegurar que retornamos [] en lugar de null en el JSON
		students := []StudentSearchResult{}

		// 3. Ejecutar la búsqueda dentro del contexto seguro del Tenant
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			query := `
				SELECT u.id, u.full_name, u.email, w.current_balance
				FROM users u
				JOIN wallets w ON u.id = w.user_id
				WHERE u.role = 'STUDENT'
				AND (u.full_name ILIKE $1 OR u.email ILIKE $1)
				LIMIT 10
			`
			return tx.Select(&students, query, searchTerm)
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "Error interno al buscar en la base de datos",
				"details": err.Error(),
			})
		}

		return c.JSON(students)
	}
}

// GetMyInstallmentsHandler devuelve la lista de cuotas del estudiante autenticado
func GetMyInstallmentsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 🛡️ PARCHE DE SEGURIDAD: Extraer Locals de forma segura sin causar Panic
		userIDRaw := c.Locals("user_id")
		tenantIDRaw := c.Locals("tenant_id")

		if userIDRaw == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "UnauthorizedError",
				"message": "Acceso denegado: No se encontró el ID del usuario. ¿Falta el middleware de JWT?",
			})
		}
		if tenantIDRaw == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "UnauthorizedError",
				"message": "Acceso denegado: No se encontró el Tenant ID.",
			})
		}

		// Ahora es seguro convertir a string
		userID := userIDRaw.(string)
		tenantID := tenantIDRaw.(string)

		var installments []InstallmentDTO

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// Consultamos las cuotas ordenadas por fecha de vencimiento
			query := `
				SELECT id, description, amount, status, due_date, created_at 
				FROM installments 
				WHERE user_id = $1 
				ORDER BY due_date ASC`

			installments = []InstallmentDTO{}
			return tx.Select(&installments, query, userID)
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "No se pudieron cargar las cuotas",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"installments": installments,
		})
	}
}

// ReceiptData almacena la información combinada para el PDF
type ReceiptData struct {
	InstallmentID string  `db:"installment_id"`
	Description   string  `db:"description"`
	Amount        float64 `db:"amount"`
	PenaltyAmount float64 `db:"penalty_amount"`
	Status        string  `db:"status"`
	DueDate       string  `db:"due_date"`
	StudentName   string  `db:"student_name"` // Asumo que tienes una columna 'name' o similar
	StudentEmail  string  `db:"student_email"`
	TenantName    string  `db:"tenant_name"`
}

// DownloadReceiptHandler genera y descarga el PDF del comprobante de pago
func DownloadReceiptHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		installmentID := c.Params("id")

		// 1. Consulta SQL (JOIN de 3 tablas)
		query := `
			SELECT 
				i.id as installment_id, 
				i.description, 
				i.amount, 
				i.penalty_amount, 
				i.status, 
				TO_CHAR(i.due_date, 'YYYY-MM-DD') as due_date,
				u.full_name as student_name, 
				u.email as student_email,
				t.name as tenant_name
			FROM installments i
			JOIN users u ON i.user_id = u.id
			JOIN tenants t ON i.tenant_id = t.id
			WHERE i.id = $1
		`

		var data ReceiptData
		err := db.Get(&data, query, installmentID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "NotFoundError",
				"message": "Cuota no encontrada o error en base de datos",
			})
		}

		// 2. Inicializar el motor PDF (Maroto)
		m := pdf.NewMaroto(consts.Portrait, consts.A4)
		m.SetPageMargins(20, 20, 20)

		// 3. Dibujar el Header
		m.RegisterHeader(func() {
			m.Row(20, func() {
				m.Col(12, func() {
					m.Text("Comprobante de Estado de Cuenta", props.Text{
						Top:   12,
						Size:  18,
						Style: consts.Bold,
						Align: consts.Center,
					})
				})
			})
		})

		// 4. Dibujar el Cuerpo del Recibo (Grilla estilo Bootstrap)
		m.Row(10, func() {
			m.Col(12, func() {
				m.Text(fmt.Sprintf("Institución: %s", data.TenantName), props.Text{Size: 12, Style: consts.Bold})
			})
		})
		m.Row(10, func() {
			m.Col(12, func() {
				m.Text(fmt.Sprintf("Estudiante: %s (%s)", data.StudentName, data.StudentEmail), props.Text{Size: 10})
			})
		})

		m.Row(10, func() {}) // Espaciador

		m.Row(10, func() {
			m.Col(4, func() { m.Text("Concepto:", props.Text{Style: consts.Bold}) })
			m.Col(8, func() { m.Text(data.Description) })
		})
		m.Row(10, func() {
			m.Col(4, func() { m.Text("Fecha Límite:", props.Text{Style: consts.Bold}) })
			m.Col(8, func() { m.Text(data.DueDate) })
		})
		m.Row(10, func() {
			m.Col(4, func() { m.Text("Estado Actual:", props.Text{Style: consts.Bold}) })
			m.Col(8, func() { m.Text(data.Status) })
		})

		m.Row(10, func() {}) // Espaciador

		// Totales
		m.Row(10, func() {
			m.Col(6, func() { m.Text("Subtotal:", props.Text{Style: consts.Bold, Align: consts.Right}) })
			m.Col(6, func() { m.Text(fmt.Sprintf("$%.2f", data.Amount)) })
		})
		m.Row(10, func() {
			m.Col(6, func() { m.Text("Mora (Penalty):", props.Text{Style: consts.Bold, Align: consts.Right}) })
			m.Col(6, func() { m.Text(fmt.Sprintf("$%.2f", data.PenaltyAmount)) })
		})
		m.Row(12, func() {
			m.Col(6, func() { m.Text("TOTAL A PAGAR:", props.Text{Size: 14, Style: consts.Bold, Align: consts.Right}) })
			m.Col(6, func() {
				m.Text(fmt.Sprintf("$%.2f", data.Amount+data.PenaltyAmount), props.Text{Size: 14, Style: consts.Bold})
			})
		})

		// 5. Compilar el PDF a memoria RAM (sin tocar el disco duro)
		// Maroto devuelve (bytes.Buffer, error), no recibe argumentos.
		buf, err := m.Output()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "Error generando PDF",
			})
		}

		// 6. Enviar el binario del PDF al Frontend
		c.Set("Content-Type", "application/pdf")
		// Sugiere al navegador abrirlo inline o descargarlo con este nombre
		c.Set("Content-Disposition", fmt.Sprintf("inline; filename=\"recibo_%s.pdf\"", installmentID[:8]))

		return c.Send(buf.Bytes())
	}
}

// MercadoPagoWebhookHandler recibe las notificaciones de pagos de MP
func MercadoPagoWebhookHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Mercado Pago puede enviar datos por Query Params o en el Body
		topic := c.Query("topic")
		if topic == "" {
			topic = c.Query("type") // A veces usa "type" en la versión V1/V2
		}
		paymentID := c.Query("data.id")
		if paymentID == "" {
			paymentID = c.Query("id")
		}

		// LOG: Imprimimos en la terminal para ver qué nos mandó MP
		fmt.Printf("🔔 [WEBHOOK MP] Recibido -> Topic/Type: %s | Payment ID: %s\n", topic, paymentID)

		// REGLA DE ORO DE MERCADO PAGO:
		// Siempre debemos responder HTTP 200 OK inmediatamente para que no reintente.
		return c.SendStatus(fiber.StatusOK)
	}
}

// Estructura para enviar los datos completos al cajero
type AdminInstallmentDTO struct {
	ID           string    `json:"id" db:"id"`
	Description  string    `json:"description" db:"description"`
	Amount       float64   `json:"amount" db:"amount"`
	DueDate      time.Time `json:"due_date" db:"due_date"`
	Status       string    `json:"status" db:"status"`
	StudentName  string    `json:"student_name" db:"student_name"`
	StudentEmail string    `json:"student_email" db:"student_email"`
}

// @Summary Listar todas las deudas (Cajeros)
// @Description Obtiene el listado completo de deudas de la universidad con información del estudiante.
// @Tags Facturación (Cajeros)
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Success 200 {array} AdminInstallmentDTO "Lista de deudas"
// @Failure 500 {object} map[string]interface{} "Error interno al consultar la base de datos"
// @Router /billing/installments [get]
func GetAllInstallmentsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extraemos el tenant_id inyectado por el middleware de autenticación
		tenantID := c.Locals("tenant_id").(string)

		// Hacemos un JOIN para cruzar la deuda con el nombre y correo del estudiante
		query := `
			SELECT 
				i.id, i.description, i.amount, i.due_date, i.status,
				u.full_name as student_name, u.email as student_email
			FROM installments i
			JOIN users u ON i.user_id = u.id
			WHERE i.tenant_id = $1
			ORDER BY i.created_at DESC
		`

		// Inicializamos el slice para devolver [] en lugar de null si no hay datos
		debts := []AdminInstallmentDTO{}

		if err := db.Select(&debts, query, tenantID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "Error al consultar las obligaciones financieras",
			})
		}

		return c.Status(fiber.StatusOK).JSON(debts)
	}
}

// DTO para enviar las métricas al Dashboard del Cajero
type BillingStatsDTO struct {
	TotalCollected float64 `json:"total_collected" db:"total_collected"`
	TotalDebt      float64 `json:"total_debt" db:"total_debt"`
	OverdueCount   int     `json:"overdue_count" db:"overdue_count"`
	ActiveStudents int     `json:"active_students" db:"active_students"`
}

// @Summary Obtener estadísticas financieras (Cajeros)
// @Description Calcula en tiempo real el capital recaudado, la deuda activa y los estudiantes en mora.
// @Tags Facturación (Cajeros)
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Success 200 {object} BillingStatsDTO "Métricas calculadas exitosamente"
// @Failure 500 {object} map[string]interface{} "Error interno al calcular métricas"
// @Router /billing/stats [get]
func GetBillingStatsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		// Consulta optimizada para PostgreSQL usando FILTER para evitar múltiples queries
		query := `
			SELECT 
				COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) as total_collected,
				COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING', 'OVERDUE')), 0) as total_debt,
				COUNT(DISTINCT user_id) FILTER (WHERE status = 'OVERDUE') as overdue_count,
				(SELECT COUNT(id) FROM users WHERE tenant_id = $1 AND role = 'STUDENT') as active_students
			FROM installments
			WHERE tenant_id = $1
		`

		stats := BillingStatsDTO{}

		if err := db.Get(&stats, query, tenantID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "InternalError",
				"message": "Error al procesar las métricas financieras",
			})
		}

		return c.Status(fiber.StatusOK).JSON(stats)
	}
}
