package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	// IMPORTANTE: Cambia 'github.com/xnzperez/edupay' por el nombre que usaste en go mod init
	"github.com/xnzperez/edupay-saas/pkg/database"
)

func main() {
	_ = godotenv.Load()

	// 1. Inicializar Conexión a DB
	db := database.ConnectDB()
	defer db.Close() // Cerrar la conexión cuando la app se apague

	app := fiber.New(fiber.Config{
		AppName: "EduPay API v1.0",
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		// Aprovechamos para checkear si la DB responde en el health check
		err := db.Ping()
		dbStatus := "connected"
		if err != nil {
			dbStatus = "disconnected"
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":   "success",
			"database": dbStatus,
			"version":  "1.0.0",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(app.Listen(":" + port))
}
