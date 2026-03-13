package billing

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"

	"github.com/xnzperez/edupay-saas/pkg/database"
)

// CreateInstallmentReq define los datos necesarios para asignarle una deuda a un estudiante.
type CreateInstallmentReq struct {
	UserID      string  `json:"user_id"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	DueDate     string  `json:"due_date"` // Formato esperado: YYYY-MM-DD
}

// CreateInstallmentHandler inserta una nueva cuota en estado 'PENDING'.
func CreateInstallmentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		var req CreateInstallmentReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		var newInstallmentID string

		// Utilizamos nuestra transacción RLS para que la cuota quede asegurada en el Tenant actual.
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
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

			// 1. Buscar la cuota y bloquearla (FOR UPDATE)
			// Bloqueamos la fila para evitar que el usuario intente pagar la misma cuota dos veces al mismo tiempo.
			var installment struct {
				UserID string  `db:"user_id"`
				Amount float64 `db:"amount"`
				Status string  `db:"status"`
			}

			getInstQuery := `SELECT user_id, amount, status FROM installments WHERE id = $1 FOR UPDATE`
			if err := tx.Get(&installment, getInstQuery, installmentID); err != nil {
				return fmt.Errorf("cuota no encontrada")
			}

			// Validar que la cuota no esté ya pagada
			if installment.Status == "PAID" {
				return fmt.Errorf("esta cuota ya fue pagada")
			}

			// 2. Buscar la billetera del usuario y bloquearla (FOR UPDATE)
			var wallet struct {
				ID      string  `db:"id"`
				Balance float64 `db:"current_balance"`
			}

			getWalletQuery := `SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE`
			if err := tx.Get(&wallet, getWalletQuery, installment.UserID); err != nil {
				return fmt.Errorf("billetera no encontrada")
			}

			// 3. Verificar si el estudiante tiene suficiente dinero
			if wallet.Balance < installment.Amount {
				return fmt.Errorf("fondos insuficientes en la billetera")
			}

			// 4. Descontar el dinero de la billetera
			updateWalletQuery := `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`
			if _, err := tx.Exec(updateWalletQuery, installment.Amount, wallet.ID); err != nil {
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

			// Hacemos la concatenación del texto directamente en Go
			reference := "Pago de cuota: " + installmentID

			// Le pasamos la referencia ya armada como el parámetro $4
			_, err := tx.Exec(txLogQuery, wallet.ID, tenantID, installment.Amount, reference)

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
			"message": "Pago procesado exitosamente. La cuota ha sido saldada.",
		})
	}
}

// ==========================================
// CONTROLADOR DE LECTURA (GET)
// ==========================================

// InstallmentDTO define cómo el frontend verá cada deuda
type InstallmentDTO struct {
	ID          string  `json:"id" db:"id"`
	Description string  `json:"description" db:"description"`
	Amount      float64 `json:"amount" db:"amount"`
	Status      string  `json:"status" db:"status"`     // PENDING, PAID, OVERDUE
	DueDate     string  `json:"due_date" db:"due_date"` // Fecha límite
	CreatedAt   string  `json:"created_at" db:"created_at"`
}

// GetMyInstallmentsHandler devuelve la lista de cuotas del estudiante autenticado
func GetMyInstallmentsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Obtenemos el ID de forma segura desde el JWT, previniendo IDOR
		userID := c.Locals("user_id").(string)
		tenantID := c.Locals("tenant_id").(string)

		var installments []InstallmentDTO

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// Consultamos las cuotas ordenadas por fecha de vencimiento (las más urgentes primero)
			query := `
				SELECT id, description, amount, status, due_date, created_at 
				FROM installments 
				WHERE user_id = $1 
				ORDER BY due_date ASC`

			// Inicializamos el slice para devolver [] en lugar de null si no hay deudas
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
