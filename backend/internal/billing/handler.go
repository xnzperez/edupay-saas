package billing

import (
	"fmt"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
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
func CreateInstallmentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		var req CreateInstallmentReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		// --- 1. VALIDACIÓN DE FECHA ESTRICTA (UTC) ---
		dueDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de fecha inválido. Debe ser YYYY-MM-DD"})
		}

		// Normalizamos ambas fechas a UTC y cortamos las horas/minutos
		today := time.Now().UTC().Truncate(24 * time.Hour)
		dueDateUTC := dueDate.UTC().Truncate(24 * time.Hour)

		if dueDateUTC.Before(today) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Operación rechazada. No puedes crear una deuda con fecha de vencimiento en el pasado.",
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
				"error":   "No se pudo crear la cuota",
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
func PayInstallmentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		installmentID := c.Params("id")
		tenantID := c.Locals("tenant_id").(string)

		// Abrimos una transacción. Si en algún punto el saldo no alcanza o hay un error,
		// TODAS las operaciones se cancelan automáticamente (Rollback).
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {

			// 0. Obtener la tasa de interés de mora del SuperAdmin
			var interestRate float64
			getTenantQuery := `SELECT default_interest_rate FROM tenants WHERE id = $1`
			if err := tx.Get(&interestRate, getTenantQuery, tenantID); err != nil {
				return fmt.Errorf("error al obtener la configuración financiera de la universidad")
			}

			// 1. Buscar la cuota y bloquearla (FOR UPDATE)
			var installment struct {
				UserID  string    `db:"user_id"`
				Amount  float64   `db:"amount"`
				Status  string    `db:"status"`
				DueDate time.Time `db:"due_date"` // <-- Añadido para verificar vencimiento
			}

			// Añadimos due_date al SELECT
			getInstQuery := `SELECT user_id, amount, status, due_date FROM installments WHERE id = $1 FOR UPDATE`
			if err := tx.Get(&installment, getInstQuery, installmentID); err != nil {
				return fmt.Errorf("cuota no encontrada")
			}

			// Validar que la cuota no esté ya pagada
			if installment.Status == "PAID" {
				return fmt.Errorf("esta cuota ya fue pagada")
			}

			// --- CÁLCULO DE MORA MATEMÁTICO ---
			totalToPay := installment.Amount
			now := time.Now()
			var penalty float64 = 0

			if now.After(installment.DueDate) {
				// Calculamos los días de retraso (redondeando hacia arriba a favor de la institución)
				duration := now.Sub(installment.DueDate)
				daysDelay := int(math.Ceil(duration.Hours() / 24.0))

				if daysDelay > 0 {
					// Fórmula: Monto * (Tasa Diaria * Días de Retraso)
					penalty = installment.Amount * (interestRate * float64(daysDelay))
					totalToPay += penalty
				}
			}
			// ----------------------------------

			// 2. Buscar la billetera del usuario y bloquearla (FOR UPDATE)
			var wallet struct {
				ID      string  `db:"id"`
				Balance float64 `db:"current_balance"`
			}

			getWalletQuery := `SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE`
			if err := tx.Get(&wallet, getWalletQuery, installment.UserID); err != nil {
				return fmt.Errorf("billetera no encontrada")
			}

			// 3. Verificar si el estudiante tiene suficiente dinero (Validamos contra el total con mora)
			if wallet.Balance < totalToPay {
				return fmt.Errorf("fondos insuficientes para cubrir la cuota y la mora. Se requieren: %.2f", totalToPay)
			}

			// 4. Descontar el dinero de la billetera (Monto base + Penalidad)
			updateWalletQuery := `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`
			if _, err := tx.Exec(updateWalletQuery, totalToPay, wallet.ID); err != nil {
				return err
			}

			// 5. Marcar la cuota como pagada
			updateInstQuery := `UPDATE installments SET status = 'PAID' WHERE id = $1`
			if _, err := tx.Exec(updateInstQuery, installmentID); err != nil {
				return err
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

			_, err := tx.Exec(txLogQuery, wallet.ID, tenantID, totalToPay, reference)

			return err
		})

		// Manejo de errores de la transacción
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "El pago fue rechazado",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
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
				"error": "Debes proporcionar un término de búsqueda",
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
				"error":   "Error interno al buscar en la base de datos",
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
				"error": "Acceso denegado: No se encontró el ID del usuario. ¿Falta el middleware de JWT?",
			})
		}
		if tenantIDRaw == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Acceso denegado: No se encontró el Tenant ID.",
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
				"error":   "No se pudieron cargar las cuotas",
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
				"error": "Cuota no encontrada o error en base de datos",
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
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando PDF"})
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
