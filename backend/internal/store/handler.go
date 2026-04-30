package store

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"

	// Importamos tu paquete de envío de correos
	"github.com/xnzperez/edupay-saas/internal/mailer"
)

// PurchaseHandler inyecta la base de datos y retorna el controlador nativo de Fiber
func PurchaseHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Extraer ID del usuario
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "No autorizado o falta el ID en el contexto JWT",
			})
		}

		// 2. Parsear el JSON
		var req PurchaseRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Formato JSON inválido",
			})
		}

		// 3. Validar contra el Catálogo
		if err := req.Validate(); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// 4. Ejecutar Transacción ACID (Recibimos el nombre y correo)
		studentName, studentEmail, err := ProcessPurchase(db, userID, req.ItemID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Extraemos el nombre legible del item para el PDF
		item := Catalog[req.ItemID]

		// 5. Procesamiento Asíncrono (Goroutine)
		// Pasamos las variables por parámetro a la función anónima para evitar "race conditions"
		go func(email, name, itemName string) {
			// A. Compilar el PDF en memoria
			pdfBytes, errPdf := GenerateCertificatePDF(name, itemName)
			if errPdf != nil {
				fmt.Printf("❌ Error generando PDF para %s: %v\n", email, errPdf)
				return // Matamos la goroutine, pero el frontend ya recibió su HTTP 200
			}

			// B. Enviar el correo usando Resend
			errMail := mailer.SendCertificateEmail(email, name, itemName, pdfBytes)
			if errMail != nil {
				fmt.Printf("❌ Error enviando correo a %s: %v\n", email, errMail)
			}
		}(studentEmail, studentName, item.Name)

		// 6. Respuesta Inmediata al Frontend
		// Esto se ejecuta en 5ms, sin importar que Resend tarde 3 segundos en enviar el correo
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Compra realizada con éxito. Tu certificado llegará al correo en breve.",
			"status":  "APPROVED",
		})
	}
}