package payment

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/xnzperez/edupay-saas/internal/billing"
	"github.com/xnzperez/edupay-saas/internal/mailer"
	"github.com/xnzperez/edupay-saas/pkg/database"
)

type PreferenceRequest struct {
	Amount float64 `json:"amount"`
}

type MPItem struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	CurrencyID  string  `json:"currency_id"`
}

// Usamos punteros para permitir omitir propiedades vacías y evitar el error 400
// 1. Simplificamos la estructura (quitamos punteros para evitar nulos ocultos)
type MPBackURLs struct {
	Success string `json:"success"`
	Failure string `json:"failure"`
	Pending string `json:"pending"`
}

type MPPreferenceBody struct {
	Items             []MPItem   `json:"items"`
	ExternalReference string     `json:"external_reference"`
	BackURLs          MPBackURLs `json:"back_urls"`
	// ELIMINADO: AutoReturn. Así evitamos que Mercado Pago bloquee el "http://localhost"
}

// CreatePreferenceHandler genera el link de pago dinámico
func CreatePreferenceHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		var req PreferenceRequest
		if err := c.BodyParser(&req); err != nil || req.Amount < 1000 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El monto debe ser mínimo $1,000 COP"})
		}

		// Cargamos la URL del frontend dinámicamente desde el .env
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:5173" // Fallback seguro para entorno local
		}

		// URLs limpias sin parámetros
		successURL := fmt.Sprintf("%s/student/dashboard", frontendURL)
		failureURL := fmt.Sprintf("%s/student/dashboard", frontendURL)
		pendingURL := fmt.Sprintf("%s/student/dashboard", frontendURL)

		// Configuramos la preferencia (Sin punteros y sin AutoReturn)
		bodyData := MPPreferenceBody{
			Items: []MPItem{
				{
					Title:       "Recarga Billetera EduPay",
					Description: "Saldo para uso dentro de la universidad",
					Quantity:    1,
					UnitPrice:   req.Amount,
					CurrencyID:  "COP",
				},
			},
			ExternalReference: userID,
			BackURLs: MPBackURLs{
				Success: successURL,
				Failure: failureURL,
				Pending: pendingURL,
			},
		}

		jsonBody, err := json.Marshal(bodyData)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error armando JSON"})
		}

		fmt.Println("\n--- ENVIANDO A MERCADO PAGO ---")
		fmt.Println(string(jsonBody))
		fmt.Println("-------------------------------\n")

		request, err := http.NewRequest("POST", "https://api.mercadopago.com/checkout/preferences", bytes.NewBuffer(jsonBody))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno del servidor"})
		}

		request.Header.Set("Authorization", "Bearer "+os.Getenv("MP_ACCESS_TOKEN"))
		request.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		response, err := client.Do(request)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "No se pudo contactar a MP"})
		}
		defer response.Body.Close()

		bodyBytes, _ := io.ReadAll(response.Body)
		var mpResponse map[string]interface{}
		json.Unmarshal(bodyBytes, &mpResponse)

		// 1. Selección dinámica del entorno (Producción vs Sandbox)
		urlKey := "sandbox_init_point" // Por defecto, entorno local/pruebas
		if os.Getenv("APP_ENV") == "production" {
			urlKey = "init_point" // Entorno real para tokens APP_USR-
		}

		// 2. Extraer la URL correcta
		initPoint, ok := mpResponse[urlKey].(string)
		if !ok {
			fmt.Println("❌ Error de MP (Respuesta):", string(bodyBytes))
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Mercado Pago rechazó la configuración"})
		}

		fmt.Println("✅ ¡Link Generado con Éxito!")
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"checkout_url": initPoint,
		})
	}
}

// Estructura para leer lo que nos responde la API de Mercado Pago
type MPPaymentResponse struct {
	Status            string  `json:"status"`
	TransactionAmount float64 `json:"transaction_amount"`
	ExternalReference string  `json:"external_reference"`
}

// WebhookHandler recibe la confirmación de pago de Mercado Pago
func WebhookHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Responder rápido (La regla de oro de los webhooks)
		c.Status(fiber.StatusOK).SendString("OK")

		paymentID := c.Query("data.id")
		if paymentID == "" {
			paymentID = c.Query("id")
		}

		if paymentID == "" {
			return nil
		}

		var paymentData MPPaymentResponse

		// ==========================================
		// 🚀 MODO DESARROLLO (Bypass de Webhook)
		// ==========================================
		if paymentID == "9999" && os.Getenv("APP_ENV") == "development" {
			fmt.Println("🛠️ [MODO DEV] Simulando pago exitoso sin consultar a MP...")
			paymentData = MPPaymentResponse{
				Status:            "approved",
				TransactionAmount: 50000,
				ExternalReference: c.Query("user_id"),
			}
		} else {
			// ==========================================
			// 🔒 FLUJO REAL (PRODUCCIÓN)
			// ==========================================
			fmt.Printf("🔍 Verificando pago ID %s con MP...\n", paymentID)
			url := fmt.Sprintf("https://api.mercadopago.com/v1/payments/%s", paymentID)
			req, _ := http.NewRequest("GET", url, nil)
			req.Header.Set("Authorization", "Bearer "+os.Getenv("MP_ACCESS_TOKEN"))

			client := &http.Client{}
			resp, err := client.Do(req)
			if err != nil || resp.StatusCode != http.StatusOK {
				fmt.Println("⚠️ MP rechazó el pago o no existe.")
				return nil
			}
			defer resp.Body.Close()
			json.NewDecoder(resp.Body).Decode(&paymentData)
		}

		// ==========================================
		// 💾 5. LÓGICA DE BASE DE DATOS
		// ==========================================
		if paymentData.Status == "approved" {
			userID := paymentData.ExternalReference
			amount := paymentData.TransactionAmount

			fmt.Printf("✅ APROBADO: Sumaremos $%v al usuario %s\n", amount, userID)

			// A. Recuperar el tenant_id del usuario
			var tenantID string
			err := db.Get(&tenantID, "SELECT tenant_id FROM users WHERE id = $1", userID)
			if err != nil {
				fmt.Println("❌ Error: No se encontró el tenant del usuario.")
				return nil
			}

			// B. Ejecución transaccional aislada (RLS)
			err = database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
				// 1. Actualizar saldo
				_, err := tx.Exec("UPDATE wallets SET current_balance = current_balance + $1, updated_at = NOW() WHERE user_id = $2", amount, userID)
				if err != nil {
					return err
				}

				// 2. Registrar movimiento en el ledger
				_, err = tx.Exec(`
					INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference) 
					VALUES ((SELECT id FROM wallets WHERE user_id = $2), $3, 'DEPOSIT', $1, 'Recarga Mercado Pago')
				`, amount, userID, tenantID)
				return err
			})

			if err != nil {
				fmt.Println("❌ Error crítico guardando en DB:", err)
			} else {
				fmt.Println("💸 ¡BILLETERA ACTUALIZADA CON ÉXITO!")

				// 1. Extraer nombre y correo del estudiante para el recibo
				var user struct {
					FullName string `db:"full_name"` // Ajusta si tu columna se llama "name"
					Email    string `db:"email"`
				}

				errUser := db.Get(&user, "SELECT full_name, email FROM users WHERE id = $1", userID)
				if errUser == nil {
					// 2. Disparar proceso asíncrono (Goroutine)
					// Esto permite responder 200 OK a Mercado Pago de inmediato
					go func(uName, uEmail string, txAmount float64) {
						fmt.Println("⚙️ Generando PDF en memoria...")
						pdfBytes, err := billing.GenerateReceiptBytes(uName, txAmount)
						if err != nil {
							fmt.Println("⚠️ Error generando PDF:", err)
							return
						}

						fmt.Println("📨 Enviando comprobante por Resend...")
						// Importante: Asegúrate de importar tu paquete "mailer" arriba
						err = mailer.SendReceiptEmail(uEmail, uName, txAmount, pdfBytes)
						if err != nil {
							fmt.Println("⚠️ Error enviando correo:", err)
						}
					}(user.FullName, user.Email, amount)
				} else {
					fmt.Println("⚠️ No se encontró el correo del usuario para enviar comprobante.")
				}
			}
		}

		return nil
	}
}
