package wallet

import (
	"fmt"
	"log"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"

	"github.com/xnzperez/edupay-saas/internal/utils"
	"github.com/xnzperez/edupay-saas/pkg/database"
)

// ==========================================
// ESTRUCTURAS Y DTOs (Data Transfer Objects)
// ==========================================

// DepositRequest es el JSON que recibiremos con el dinero a ingresar
type DepositRequest struct {
	Amount float64 `json:"amount" validate:"required,gt=0"`
}

// TransferRequest define los datos para enviar dinero a otro estudiante
type TransferRequest struct {
	ToEmail string  `json:"to_email" validate:"required,email"`
	Amount  float64 `json:"amount" validate:"required,min=5000"` // Monto mínimo $5,000 COP
}

// TransactionDTO define cómo el frontend verá cada movimiento individual.
type TransactionDTO struct {
	ID        string  `json:"id" db:"id"`
	TxType    string  `json:"tx_type" db:"tx_type"` // DEPOSIT, PURCHASE, FEE, TRANSFER_IN, TRANSFER_OUT
	Amount    float64 `json:"amount" db:"amount"`
	Reference string  `json:"reference" db:"reference"`
	CreatedAt string  `json:"created_at" db:"created_at"`
}

// WalletDashboardResponse es el "paquete completo" que enviaremos a la UI.
type WalletDashboardResponse struct {
	WalletID       string                                  `json:"wallet_id" db:"id"`
	CurrentBalance float64                                 `json:"current_balance" db:"current_balance"`
	UpdatedAt      string                                  `json:"updated_at" db:"updated_at"`
	Transactions   utils.PaginatedResponse[TransactionDTO] `json:"transactions"`
}

// ==========================================
// CONTROLADOR DE RECARGAS (DEPOSIT)
// ==========================================

func DepositHandler(db *sqlx.DB, validate *validator.Validate) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Params("user_id")
		tenantID := c.Locals("tenant_id").(string)

		var req DepositRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload inválido"})
		}

		// Usamos el validador en lugar de condicionales manuales
		if err := validate.Struct(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Monto inválido. Debe ser mayor a 0."})
		}

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			var wallet struct {
				ID             string  `db:"id"`
				CurrentBalance float64 `db:"current_balance"`
			}

			// Bloqueo de fila para evitar race conditions
			getWalletQuery := `SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE`
			if err := tx.Get(&wallet, getWalletQuery, userID); err != nil {
				return err
			}

			// Actualizar saldo
			updateQuery := `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`
			if _, err := tx.Exec(updateQuery, req.Amount, wallet.ID); err != nil {
				return err
			}

			// Registrar transacción
			txLogQuery := `
				INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference)
				VALUES ($1, $2, 'DEPOSIT', $3, 'Depósito manual (Cajero UCC)')`
			if _, err := tx.Exec(txLogQuery, wallet.ID, tenantID, req.Amount); err != nil {
				return err
			}

			return nil
		})

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
// CONTROLADOR DE LECTURA (DASHBOARD)
// ==========================================

func GetWalletDashboardHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)
		tenantID := c.Locals("tenant_id").(string)

		// 1. Extraer Query Params para Paginación (con valores por defecto seguros)
		page := c.QueryInt("page", 1)
		limit := c.QueryInt("limit", 10)

		// Protección contra payloads abusivos (Seguridad)
		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 10
		}
		if limit > 50 {
			limit = 50
		} // Máximo 50 por página para no saturar memoria RAM

		var response WalletDashboardResponse

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// A. Buscar Billetera
			walletQuery := `SELECT id, current_balance, updated_at FROM wallets WHERE user_id = $1`
			if err := tx.Get(&response, walletQuery, userID); err != nil {
				return fmt.Errorf("billetera no encontrada para este usuario")
			}

			// B. Contar el TOTAL de registros (Matemática pura para el paginador)
			var totalRecords int
			countQuery := `SELECT COUNT(*) FROM wallet_txs WHERE wallet_id = $1`
			if err := tx.Get(&totalRecords, countQuery, response.WalletID); err != nil {
				return fmt.Errorf("error contando historial: %v", err)
			}

			// C. Calcular Offset (Saltar registros anteriores)
			offset := (page - 1) * limit

			// D. Consultar la "Página" específica
			txsQuery := `
				SELECT id, tx_type, amount, COALESCE(reference, '') as reference, created_at
				FROM wallet_txs
				WHERE wallet_id = $1
				ORDER BY created_at DESC
				LIMIT $2 OFFSET $3`

			var txs []TransactionDTO
			if err := tx.Select(&txs, txsQuery, response.WalletID, limit, offset); err != nil {
				return fmt.Errorf("error al obtener el historial paginado: %v", err)
			}

			// E. Si la página está vacía, iniciamos el slice para que devuelva [] en JSON y no null
			if txs == nil {
				txs = []TransactionDTO{}
			}

			// F. Empaquetar todo en nuestro DTO Genérico
			response.Transactions = utils.PaginatedResponse[TransactionDTO]{
				Data:       txs,
				Total:      totalRecords,
				Page:       page,
				Limit:      limit,
				TotalPages: utils.CalculateTotalPages(totalRecords, limit),
			}

			return nil
		})

		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "No se pudo cargar el dashboard",
				"details": err.Error(),
			})
		}

		return c.Status(fiber.StatusOK).JSON(response)
	}
}

// ==========================================
// CONTROLADOR DE TRANSFERENCIAS (P2P)
// ==========================================

func TransferHandler(db *sqlx.DB, validate *validator.Validate) fiber.Handler {
	return func(c *fiber.Ctx) error {
		senderID := c.Locals("user_id").(string)
		tenantID := c.Locals("tenant_id").(string)

		var req TransferRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		// Validación robusta
		if err := validate.Struct(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Datos inválidos. Verifica que el correo sea válido y el monto mínimo sea $5000 COP.",
			})
		}

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// 1. Buscar al destinatario
			var receiverID string
			err := tx.Get(&receiverID, `SELECT id FROM users WHERE email = $1`, req.ToEmail)
			if err != nil {
				return fmt.Errorf("el destinatario no existe en esta universidad")
			}

			if senderID == receiverID {
				return fmt.Errorf("no puedes enviarte dinero a ti mismo")
			}

			// 2. PREVENCIÓN DE DEADLOCKS OPTIMIZADA
			type WalletLock struct {
				ID      string  `db:"id"`
				UserID  string  `db:"user_id"`
				Balance float64 `db:"current_balance"`
			}
			var lockedWallets []WalletLock

			err = tx.Select(&lockedWallets, `
				SELECT id, user_id, current_balance 
				FROM wallets 
				WHERE user_id IN ($1, $2) 
				ORDER BY user_id 
				FOR UPDATE`, senderID, receiverID)

			if err != nil || len(lockedWallets) != 2 {
				return fmt.Errorf("error al procesar las billeteras o una billetera no existe")
			}

			var senderWallet, receiverWallet WalletLock
			for _, w := range lockedWallets {
				if w.UserID == senderID {
					senderWallet = w
				} else {
					receiverWallet = w
				}
			}

			// 3. Validar fondos
			if senderWallet.Balance < req.Amount {
				return fmt.Errorf("saldo insuficiente para la transferencia")
			}

			// 4. Actualizar saldos
			_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, req.Amount, senderWallet.ID)
			if err != nil {
				return err
			}

			_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, req.Amount, receiverWallet.ID)
			if err != nil {
				return err
			}

			// 5. Registrar en el Ledger con tipos P2P
			txLogQuery := `INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference) VALUES ($1, $2, $3, $4, $5)`

			_, err = tx.Exec(txLogQuery, senderWallet.ID, tenantID, "TRANSFER_OUT", req.Amount, "Envío a: "+req.ToEmail)
			if err != nil {
				return err
			}

			_, err = tx.Exec(txLogQuery, receiverWallet.ID, tenantID, "TRANSFER_IN", req.Amount, "Recibido de un compañero")

			return err
		})

		if err != nil {
			statusCode := fiber.StatusInternalServerError
			if err.Error() == "saldo insuficiente para la transferencia" ||
				err.Error() == "no puedes enviarte dinero a ti mismo" ||
				err.Error() == "el destinatario no existe en esta universidad" {
				statusCode = fiber.StatusBadRequest
			}

			return c.Status(statusCode).JSON(fiber.Map{
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

// ==========================================
// SERVICIOS DE ADMINISTRADOR (AUDITORÍA)
// ==========================================

// GlobalTransactionDTO representa el historial cruzado con el dueño de la cuenta
type GlobalTransactionDTO struct {
	ID           string    `json:"id" db:"id"`
	TxType       string    `json:"tx_type" db:"tx_type"`
	Amount       float64   `json:"amount" db:"amount"`
	Reference    *string   `json:"reference" db:"reference"`   // Puntero para soportar campos NULL en Postgres
	CreatedAt    time.Time `json:"created_at" db:"created_at"` // time.Time en lugar de string
	UserEmail    string    `json:"user_email" db:"email"`
	UserFullName string    `json:"user_full_name" db:"full_name"`
}

// GetAllTransactions extrae el flujo de caja global de todo el tenant con paginación
func GetAllTransactions(db *sqlx.DB, page, limit int) ([]GlobalTransactionDTO, int, error) {
	offset := (page - 1) * limit

	var total int
	// CORRECCIÓN 1: Contamos en tu tabla real (wallet_txs)
	err := db.Get(&total, `SELECT COUNT(*) FROM wallet_txs`)
	if err != nil {
		log.Printf("[Auditoría] Error contando transacciones: %v\n", err)
		return nil, 0, err
	}

	// CORRECCIÓN 2: Leemos de tu tabla real (wallet_txs)
	query := `
		SELECT 
			t.id, t.tx_type, t.amount, t.reference, t.created_at,
			u.email, u.full_name
		FROM wallet_txs t
		JOIN wallets w ON t.wallet_id = w.id
		JOIN users u ON w.user_id = u.id
		ORDER BY t.created_at DESC
		LIMIT $1 OFFSET $2
	`

	var transactions []GlobalTransactionDTO
	if err := db.Select(&transactions, query, limit, offset); err != nil {
		log.Printf("[Auditoría] Error ejecutando SELECT JOIN: %v\n", err)
		return nil, 0, err
	}
	if transactions == nil {
		transactions = []GlobalTransactionDTO{}
	}

	return transactions, total, nil
}

// GetAdminTransactions maneja la petición HTTP para la auditoría global de cajeros
func GetAdminTransactions(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Parseamos los parámetros de paginación de la URL (ej: ?page=1&limit=10)
		page := c.QueryInt("page", 1)
		limit := c.QueryInt("limit", 10)

		// Sanitización básica para evitar queries absurdos
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 50 {
			limit = 10
		}

		// 2. Llamamos a nuestra función de BD
		transactions, total, err := GetAllTransactions(db, page, limit)
		if err != nil {
			log.Printf("[API] Fallo GetAdminTransactions: %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Error interno al recuperar la auditoría de transacciones",
			})
		}

		// 3. Calculamos el total de páginas
		totalPages := (total + limit - 1) / limit

		// 4. Retornamos el contrato de Paginación exacto que React espera
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"data":        transactions,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		})
	}
}
