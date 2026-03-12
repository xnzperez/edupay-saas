package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // Driver de Postgres
)

func ConnectDB() *sqlx.DB {
	// Intentamos obtener la URL completa si existe
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		// Construimos el DSN desde variables individuales para desarrollo local
		dsn = fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=%s",
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_HOST"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_SSLMODE"),
		)
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("No se pudo conectar a la base de datos: %v", err)
	}

	// Optimizaciones del pool de conexiones
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	fmt.Println("✅ Conexión a PostgreSQL establecida exitosamente")
	return db
}
