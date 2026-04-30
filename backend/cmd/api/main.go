package main

import (
	"log"
	"os"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/joho/godotenv"

	"github.com/xnzperez/edupay-saas/pkg/database"

	"github.com/xnzperez/edupay-saas/internal/auth"
	"github.com/xnzperez/edupay-saas/internal/billing"
	"github.com/xnzperez/edupay-saas/internal/payment"
	"github.com/xnzperez/edupay-saas/internal/store"
	"github.com/xnzperez/edupay-saas/internal/tenant"
	"github.com/xnzperez/edupay-saas/internal/user"
	"github.com/xnzperez/edupay-saas/internal/wallet"

	_ "github.com/xnzperez/edupay-saas/docs"
)

// @title EduPay SaaS API
// @version 1.0
// @description Motor financiero multi-tenant para universidades con control de roles y prevención de IDOR.
// @contact.name Carlos Pérez
// @contact.url https://xnzperez-portfolio.vercel.app/
// @host localhost:3000
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Escribe 'Bearer ' seguido de tu token JWT.

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ INFO: No se encontró archivo .env")
	}

	db := database.ConnectDB()
	defer db.Close()

	// Instanciamos el validador globalmente para pasarlo a los handlers
	validate := validator.New()

	app := fiber.New(fiber.Config{AppName: "EduPay API v1.0"})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	// ==========================================
	// RUTAS DE ADMINISTRACIÓN Y PÚBLICAS GLOBALES
	// ==========================================
	app.Get("/swagger/*", swagger.HandlerDefault)

	app.Get("/health", func(c *fiber.Ctx) error {
		err := db.Ping()
		dbStatus := "connected"
		if err != nil {
			dbStatus = "disconnected"
		}
		return c.Status(200).JSON(fiber.Map{"status": "success", "database": dbStatus})
	})

	app.Post("/admin/tenants", tenant.CreateTenantHandler(db))
	// Webhooks externos (Públicos)
	app.Post("/webhooks/mercadopago", payment.WebhookHandler(db))

	// ==========================================
	// GRUPO MULTI-TENANT (Requiere X-Tenant-ID)
	// ==========================================
	api := app.Group("/api", tenant.Middleware())

	// --- ZONA PÚBLICA DEL TENANT (No requiere Token) ---
	api.Post("/users/register", user.RegisterHandler(db))
	api.Post("/users/login", user.LoginHandler(db))

	// --- BARRERA DE SEGURIDAD JWT ---
	// Todo lo que declaremos de aquí hacia abajo exigirá estar logueado (Token Bearer)
	api.Use(auth.Protected())

	// ==========================================
	// 1. RUTAS DE ESTUDIANTES (Cualquier usuario logueado)
	// ==========================================
	api.Get("/wallets/me", wallet.GetWalletDashboardHandler(db))
	api.Get("/billing/installments/:id/receipt", billing.DownloadReceiptHandler(db))
	api.Post("/wallets/transfer", wallet.TransferHandler(db, validate))
	api.Post("/payments/preference", payment.CreatePreferenceHandler())

	// Módulo Tienda (Pagos con Saldo)
	api.Post("/store/buy", store.PurchaseHandler(db))

	// 🎓 Módulo del Estudiante (Pagos de Cartera)
	api.Get("/billing/my-installments", billing.GetMyInstallmentsHandler(db))
	api.Post("/billing/installments/:id/pay", billing.PayInstallmentHandler(db))

	// ==========================================
	// 2. RUTAS DE ADMINISTRADOR (Solo Cajeros)
	// ==========================================
	// Usamos el middleware auth.RequireRole("ADMIN") para proteger estos endpoints
	api.Get("/users/search", auth.RequireRole("ADMIN"), user.SearchStudentHandler(db))
	api.Post("/wallets/:user_id/deposit", auth.RequireRole("ADMIN"), wallet.DepositHandler(db, validate))

	// 💼 Módulo del Cajero (Facturación y Deudas)
	api.Get("/billing/students/search", auth.RequireRole("ADMIN"), billing.SearchStudentsHandler(db))
	api.Post("/billing/installments", auth.RequireRole("ADMIN"), billing.CreateInstallmentHandler(db))

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Iniciando servidor en el puerto %s...", port)
	log.Fatal(app.Listen(":" + port))
}
