package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"

	"github.com/xnzperez/edupay-saas/pkg/database"

	"github.com/xnzperez/edupay-saas/internal/auth"
	"github.com/xnzperez/edupay-saas/internal/billing"
	"github.com/xnzperez/edupay-saas/internal/tenant"
	"github.com/xnzperez/edupay-saas/internal/user"
	"github.com/xnzperez/edupay-saas/internal/wallet"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ INFO: No se encontró archivo .env")
	}

	db := database.ConnectDB()
	defer db.Close()

	app := fiber.New(fiber.Config{AppName: "EduPay API v1.0"})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	// 5. RUTAS DE ADMINISTRACIÓN Y PÚBLICAS (Sin Middleware)
	app.Get("/health", func(c *fiber.Ctx) error {
		err := db.Ping()
		dbStatus := "connected"
		if err != nil {
			dbStatus = "disconnected"
		}
		return c.Status(200).JSON(fiber.Map{"status": "success", "database": dbStatus})
	})

	// NUEVA RUTA: POST para crear Tenants
	app.Post("/admin/tenants", tenant.CreateTenantHandler(db))

	// 6. RUTAS PROTEGIDAS (Con Middleware Multi-tenant)
	// Creamos un grupo de rutas. Todo lo que esté bajo "api" pasará por el guardia.
	api := app.Group("/api", tenant.Middleware())
	// Endpoint de prueba para verificar que el guardia funciona
	// Endpoint de prueba para verificar que el RLS funciona en Postgres
	api.Get("/test-tenant", func(c *fiber.Ctx) error {
		// 1. Obtenemos el ID del middleware (como un string)
		tenantID := c.Locals("tenant_id").(string)

		// 2. Usamos nuestro nuevo wrapper para consultar la base de datos
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// Intentamos contar cuántos usuarios tiene ESTE tenant.
			// Gracias al RLS, Postgres automáticamente filtrará esta consulta,
			// como si hubiéramos escrito "WHERE tenant_id = 'el-id'".
			var count int
			err := tx.Get(&count, "SELECT COUNT(*) FROM users")
			if err != nil {
				return err
			}

			// Guardamos el resultado en el contexto de Fiber para imprimirlo
			c.Locals("user_count", count)
			return nil
		})

		// 3. Manejo de errores de base de datos (ej: si el tenant no es un UUID válido)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Error de Base de Datos",
				"details": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message":          "Transacción RLS exitosa",
			"active_tenant_id": tenantID,
			"users_found":      c.Locals("user_count"),
		})
	})

	// --- ZONA PÚBLICA DEL TENANT (No requiere Token) ---
	api.Post("/users/register", user.RegisterHandler(db))
	api.Post("/users/login", user.LoginHandler(db))

	// --- BARRERA DE SEGURIDAD JWT ---
	// Todo lo que declaremos de aquí hacia abajo exigirá estar logueado (Token Bearer)
	api.Use(auth.Protected())

	// 1. RUTAS DE ESTUDIANTE (Cualquier usuario logueado puede acceder a lo suyo)
	api.Get("/wallets/me", wallet.GetWalletDashboardHandler(db))
	api.Post("/billing/installments/:id/pay", billing.PayInstallmentHandler(db))

	// 2. RUTAS DE ADMINISTRADOR (Requieren Token Y el rol 'ADMIN')
	// Creamos un subgrupo que hereda la ruta "/api" y le agregamos la barrera de rol.
	adminAPI := api.Group("/", auth.RequireRole("ADMIN"))

	// Estas rutas ahora están doblemente protegidas: JWT + Rol ADMIN
	adminAPI.Post("/wallets/:user_id/deposit", wallet.DepositHandler(db))
	adminAPI.Post("/billing/installments", billing.CreateInstallmentHandler(db))

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Iniciando servidor en el puerto %s...", port)
	log.Fatal(app.Listen(":" + port))
}
