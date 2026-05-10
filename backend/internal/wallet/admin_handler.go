package wallet

import (
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// TransactionExportDTO representa la fila plana que irá en el Excel/CSV
type TransactionExportDTO struct {
	TxID      string  `db:"tx_id"`
	Date      string  `db:"created_at"`
	Type      string  `db:"tx_type"`
	Amount    float64 `db:"amount"`
	Reference string  `db:"reference"`
	Student   string  `db:"student_name"`
	Email     string  `db:"student_email"`
}

// ExportTransactionsCSV genera un archivo CSV al vuelo para auditoría
func ExportTransactionsCSV(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		// 1. Consulta SQL optimizada (JOIN entre transacciones, wallets y users)
		query := `
			SELECT 
				t.id as tx_id, 
				t.created_at, 
				t.tx_type, 
				t.amount, 
				COALESCE(t.reference, 'N/A') as reference,
				u.full_name as student_name,
				u.email as student_email
			FROM wallet_txs t
			INNER JOIN wallets w ON t.wallet_id = w.id
			INNER JOIN users u ON w.user_id = u.id
			WHERE t.tenant_id = $1
			ORDER BY t.created_at DESC
		`

		var records []TransactionExportDTO
		if err := db.Select(&records, query, tenantID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Error extrayendo datos para el CSV",
			})
		}

		// 2. Configurar cabeceras HTTP para forzar la descarga del archivo en el navegador
		filename := fmt.Sprintf("auditoria_edupay_%s.csv", time.Now().Format("20060102_150405"))
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

		// 3. Escribir el CSV directamente al flujo de respuesta de Fiber
		writer := csv.NewWriter(c.Response().BodyWriter())

		// Cabeceras del CSV
		if err := writer.Write([]string{"ID Transaccion", "Fecha", "Tipo", "Monto", "Referencia", "Estudiante", "Correo"}); err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Error escribiendo cabeceras CSV")
		}

		// Filas de datos
		for _, record := range records {
			row := []string{
				record.TxID,
				record.Date,
				record.Type,
				fmt.Sprintf("%.2f", record.Amount),
				record.Reference,
				record.Student,
				record.Email,
			}
			if err := writer.Write(row); err != nil {
				return c.Status(fiber.StatusInternalServerError).SendString("Error escribiendo fila CSV")
			}
		}

		// Asegurar que todo se envíe
		writer.Flush()
		if err := writer.Error(); err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Error finalizando el CSV")
		}

		return nil
	}
}
