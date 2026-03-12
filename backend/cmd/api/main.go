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
)

func main() {
	// 1. Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ INFO: No se encontró archivo .env, usando variables del sistema")
	}

	// 2. Inicializar Conexión a DB
	db := database.ConnectDB()
	defer db.Close() // Cerrar la conexión cuando la app se apague de forma segura

	// 3. Inicializar Fiber
	app := fiber.New(fiber.Config{
		AppName: "EduPay API v1.0",
	})

	// 4. Middlewares globales
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	// 5. Endpoint de Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
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

	// 6. Configurar puerto y levantar servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Iniciando servidor en el puerto %s...", port)
	log.Fatal(app.Listen(":" + port))
}
