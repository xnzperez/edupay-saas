package wallet

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"

	"github.com/xnzperez/edupay-saas/pkg/database"
)

// DepositRequest es el JSON que recibiremos con el dinero a ingresar
type DepositRequest struct {
	Amount float64 `json:"amount"`
}

// DepositHandler procesa la recarga de saldo
func DepositHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Extraemos el ID del estudiante de la URL (ej: /api/wallets/123/deposit)
		userID := c.Params("user_id")
		tenantID := c.Locals("tenant_id").(string) // El Guardia de Seguridad (Middleware)

		var req DepositRequest
		if err := c.BodyParser(&req); err != nil || req.Amount <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Monto inválido. Debe ser mayor a 0."})
		}

		// 2. Abrimos la transacción blindada por RLS
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {

			// A) Buscar la billetera de este usuario y BLOQUEARLA (FOR UPDATE)
			// Esto previene race conditions si hay múltiples pagos al mismo tiempo.
			var wallet struct {
				ID             string  `db:"id"`
				CurrentBalance float64 `db:"current_balance"`
			}

			getWalletQuery := `SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE`
			if err := tx.Get(&wallet, getWalletQuery, userID); err != nil {
				return err // Falla si el usuario no existe o pertenece a otra Universidad (RLS actúa aquí)
			}

			// B) Sumar el saldo
			updateQuery := `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`
			if _, err := tx.Exec(updateQuery, req.Amount, wallet.ID); err != nil {
				return err
			}

			// C) Guardar el recibo (Historial de transacción)
			txLogQuery := `
				INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference)
				VALUES ($1, $2, 'DEPOSIT', $3, 'Depósito manual (Cajero UCC)')`
			if _, err := tx.Exec(txLogQuery, wallet.ID, tenantID, req.Amount); err != nil {
				return err
			}

			return nil // Todo en orden, hacemos Commit
		})

		// 3. Manejo de Errores
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "No se pudo procesar el depósito",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message":          "Depósito realizado con éxito",
			"deposited_amount": req.Amount,
		})
	}
}

// ==========================================
// ESTRUCTURAS DE RESPUESTA (DTOs)
// ==========================================

// TransactionDTO define cómo el frontend verá cada movimiento individual.
// Usamos "db" para mapear desde PostgreSQL y "json" para exportar a TypeScript.
type TransactionDTO struct {
	ID        string  `json:"id" db:"id"`
	TxType    string  `json:"tx_type" db:"tx_type"` // DEPOSIT, PURCHASE, FEE
	Amount    float64 `json:"amount" db:"amount"`
	Reference string  `json:"reference" db:"reference"`
	CreatedAt string  `json:"created_at" db:"created_at"`
}

// WalletDashboardResponse es el "paquete completo" que enviaremos a la UI.
type WalletDashboardResponse struct {
	WalletID       string           `json:"wallet_id" db:"id"`
	CurrentBalance float64          `json:"current_balance" db:"current_balance"`
	UpdatedAt      string           `json:"updated_at" db:"updated_at"`
	Transactions   []TransactionDTO `json:"transactions"` // Un arreglo con el historial
}

// ==========================================
// CONTROLADOR DE LECTURA (GET)
// ==========================================

// GetWalletDashboardHandler obtiene el saldo y los últimos movimientos del estudiante
// @Summary Obtener dashboard de la billetera
// @Description Devuelve el saldo actual y el historial de transacciones del usuario autenticado a través del token JWT.
// @Tags Billetera
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Security BearerAuth
// @Success 200 {object} WalletDashboardResponse "Dashboard cargado exitosamente"
// @Failure 401 {object} map[string]interface{} "Token inválido, expirado o ausente"
// @Failure 404 {object} map[string]interface{} "Billetera no encontrada"
// @Router /wallets/me [get]
func GetWalletDashboardHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {

		// Obtenemos el ID directamente del token JWT verificado.
		userID := c.Locals("user_id").(string)
		tenantID := c.Locals("tenant_id").(string)

		var response WalletDashboardResponse

		// Utilizamos RunInTenantTx incluso para leer. Así garantizamos que
		// nadie pueda consultar una billetera que no pertenezca a su Universidad.
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {

			// 1. Obtener los datos básicos de la billetera
			walletQuery := `SELECT id, current_balance, updated_at FROM wallets WHERE user_id = $1`
			if err := tx.Get(&response, walletQuery, userID); err != nil {
				return fmt.Errorf("billetera no encontrada para este usuario")
			}

			// 2. Obtener el historial de transacciones (del más nuevo al más viejo)
			// COALESCE evita errores si "reference" viene nulo desde la base de datos.
			// LIMIT 10 es una buena práctica para no sobrecargar el frontend de golpe.
			txsQuery := `
				SELECT id, tx_type, amount, COALESCE(reference, '') as reference, created_at
				FROM wallet_txs
				WHERE wallet_id = $1
				ORDER BY created_at DESC
				LIMIT 10`

			// Inicializamos el slice vacío. Si no hay transacciones, el frontend
			// recibirá un array vacío [] en lugar de un molesto "null".
			response.Transactions = []TransactionDTO{}

			// tx.Select ejecuta la consulta y mapea automáticamente cada fila
			// al arreglo de estructuras TransactionDTO. ¡Magia de sqlx!
			if err := tx.Select(&response.Transactions, txsQuery, response.WalletID); err != nil {
				return fmt.Errorf("error al obtener el historial: %v", err)
			}

			return nil
		})

		// Si algo falla, devolvemos un 404 (Not Found) o un 500
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "No se pudo cargar el dashboard",
				"details": err.Error(),
			})
		}

		// Enviamos el JSON perfectamente estructurado
		return c.Status(fiber.StatusOK).JSON(response)
	}
}

// ==========================================
// CONTROLADOR DE TRANSFERENCIAS (P2P)
// ==========================================

// TransferRequest define los datos para enviar dinero a otro estudiante
type TransferRequest struct {
	ToEmail string  `json:"to_email"`
	Amount  float64 `json:"amount"`
}

// TransferHandler procesa el envío de saldo entre dos usuarios de la misma universidad
func TransferHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// El ID del que envía viene asegurado por el JWT
		senderID := c.Locals("user_id").(string)
		tenantID := c.Locals("tenant_id").(string)

		var req TransferRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		if req.Amount <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El monto debe ser mayor a 0"})
		}

		// Iniciamos la transacción blindada
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// 1. Buscar al destinatario por su email
			var receiverID string
			err := tx.Get(&receiverID, `SELECT id FROM users WHERE email = $1`, req.ToEmail)
			if err != nil {
				return fmt.Errorf("el destinatario no existe en esta universidad")
			}

			if senderID == receiverID {
				return fmt.Errorf("no puedes enviarte dinero a ti mismo")
			}

			// 2. PREVENCIÓN DE DEADLOCKS: Ordenamos los IDs para bloquear siempre en el mismo orden
			firstID, secondID := senderID, receiverID
			if senderID > receiverID {
				firstID, secondID = receiverID, senderID
			}

			// Bloqueamos la billetera 1 y 2 en la base de datos (FOR UPDATE)
			_, err = tx.Exec(`SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`, firstID)
			if err != nil {
				return err
			}

			_, err = tx.Exec(`SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`, secondID)
			if err != nil {
				return err
			}

			// 3. Obtener los datos actuales del remitente (y verificar si tiene dinero)
			var senderWallet struct {
				ID      string  `db:"id"`
				Balance float64 `db:"current_balance"`
			}
			tx.Get(&senderWallet, `SELECT id, current_balance FROM wallets WHERE user_id = $1`, senderID)

			if senderWallet.Balance < req.Amount {
				return fmt.Errorf("saldo insuficiente para la transferencia")
			}

			// 4. Obtener el ID de la billetera del destinatario
			var receiverWalletID string
			tx.Get(&receiverWalletID, `SELECT id FROM wallets WHERE user_id = $1`, receiverID)

			// 5. Ejecutar los movimientos de dinero (restar al remitente, sumar al destinatario)
			_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, req.Amount, senderWallet.ID)
			if err != nil {
				return err
			}

			_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, req.Amount, receiverWalletID)
			if err != nil {
				return err
			}

			// 6. Registrar los comprobantes en el historial
			txLogQuery := `INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference) VALUES ($1, $2, $3, $4, $5)`

			// Historial de salida (Remitente) - Usamos 'PURCHASE' según tu constraint
			_, err = tx.Exec(txLogQuery, senderWallet.ID, tenantID, "PURCHASE", req.Amount, "Envío a: "+req.ToEmail)
			if err != nil {
				return err
			}

			// Historial de entrada (Destinatario) - Usamos 'DEPOSIT' según tu constraint
			_, err = tx.Exec(txLogQuery, receiverWalletID, tenantID, "DEPOSIT", req.Amount, "Recibido de: un compañero")

			return err
		})

		// Si falló la transacción, devolvemos el error exacto
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "La transferencia fue rechazada",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Transferencia enviada con éxito",
			"amount":  req.Amount,
			"to":      req.ToEmail,
		})
	}
}
