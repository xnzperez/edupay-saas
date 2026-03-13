package wallet

import (
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
