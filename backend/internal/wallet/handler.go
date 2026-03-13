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
