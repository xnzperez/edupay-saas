package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // Driver de Postgres
)

// ConnectDB inicializa la conexión a PostgreSQL
func ConnectDB() *sqlx.DB {
	// Obtenemos la URL de conexión de las variables de entorno o usamos la de Docker por defecto
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Formato: user=... password=... host=... port=... dbname=... sslmode=disable
		dsn = "user=edupay_admin password=secretpassword123 host=localhost port=5433 dbname=edupay sslmode=disable"
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("No se pudo conectar a la base de datos: %v", err)
	}

	// Configuraciones de optimización para el pool de conexiones
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	fmt.Println("✅ Conexión a PostgreSQL establecida exitosamente")
	return db
}
