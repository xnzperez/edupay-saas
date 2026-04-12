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

type MPBackURLs struct {
	Success string `json:"success"`
	Failure string `json:"failure"`
	Pending string `json:"pending"`
}

type MPPreferenceBody struct {
	Items             []MPItem   `json:"items"`
	ExternalReference string     `json:"external_reference"`
	BackURLs          MPBackURLs `json:"back_urls"`
	AutoReturn        string     `json:"auto_return"`
}

func CreatePreferenceHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		var req PreferenceRequest
		if err := c.BodyParser(&req); err != nil || req.Amount < 1000 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El monto debe ser mínimo $1,000 COP"})
		}

		// URLs para que Mercado Pago nos devuelva al estudiante al terminar
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
				Success: "http://localhost:5173/student/dashboard?status=approved",
				Failure: "http://localhost:5173/student/dashboard?status=rejected",
				Pending: "http://localhost:5173/student/dashboard?status=pending",
			},
		}

		jsonBody, err := json.Marshal(bodyData)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error armando JSON"})
		}

		// 🔍 RAYOS X: Vamos a ver exactamente qué está escupiendo Go
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

		initPoint, ok := mpResponse["sandbox_init_point"].(string)
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

func WebhookHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Responder rápido (La regla de oro)
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
		// 🚀 EL CHEAT CODE (MODO DESARROLLO)
		// ==========================================
		if paymentID == "9999" {
			fmt.Println("🛠️ [MODO DEV] Simulando pago exitoso sin consultar a MP...")
			paymentData = MPPaymentResponse{
				Status:            "approved",
				TransactionAmount: 50000,
				ExternalReference: c.Query("user_id"), // Lo pasaremos por Postman
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
		// 💾 5. LÓGICA DE BASE DE DATOS (EDUPAY)
		// ==========================================
		if paymentData.Status == "approved" {
			userID := paymentData.ExternalReference
			amount := paymentData.TransactionAmount

			fmt.Printf("✅ APROBADO: Sumaremos $%v al usuario %s\n", amount, userID)

			// A. Como el webhook es público, no tenemos el Tenant en el middleware.
			// Tenemos que preguntarle a la base de datos a qué universidad pertenece este usuario.
			var tenantID string
			err := db.Get(&tenantID, "SELECT tenant_id FROM users WHERE id = $1", userID)
			if err != nil {
				fmt.Println("❌ Error: No se encontró el tenant del usuario.")
				return nil
			}

			// B. Usamos tu función segura con RLS para inyectar el dinero
			err = database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
				// 1. Sumar a la billetera
				_, err := tx.Exec("UPDATE wallets SET current_balance = current_balance + $1, updated_at = NOW() WHERE user_id = $2", amount, userID)
				if err != nil {
					return err
				}

				// 2. Dejar el recibo en transacciones (CORREGIDO: wallet_txs y pasamos el tenant_id)
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
			}
		}

		return nil
	}
}
