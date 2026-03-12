package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/xnzperez/edupay-saas/pkg/database"

	// IMPORTANTE: Agregamos la importación de nuestro dominio de tenant
	"github.com/xnzperez/edupay-saas/internal/tenant"
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

	// 5. RUTAS PÚBLICAS (Sin Middleware)
	app.Get("/health", func(c *fiber.Ctx) error {
		err := db.Ping()
		dbStatus := "connected"
		if err != nil {
			dbStatus = "disconnected"
		}
		return c.Status(200).JSON(fiber.Map{"status": "success", "database": dbStatus})
	})

	// 6. RUTAS PROTEGIDAS (Con Middleware Multi-tenant)
	// Creamos un grupo de rutas. Todo lo que esté bajo "api" pasará por el guardia.
	api := app.Group("/api", tenant.Middleware())

	// Endpoint de prueba para verificar que el guardia funciona
	api.Get("/test-tenant", func(c *fiber.Ctx) error {
		// Recuperamos el tenant_id que el guardia guardó en la memoria
		id := c.Locals("tenant_id")
		return c.JSON(fiber.Map{
			"message":          "Estás en una zona segura multi-tenant",
			"active_tenant_id": id,
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Iniciando servidor en el puerto %s...", port)
	log.Fatal(app.Listen(":" + port))
}
