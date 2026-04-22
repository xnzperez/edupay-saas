package main

import (
	"log"
	"sync"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"

	"github.com/xnzperez/edupay-saas/pkg/database"
)

// TenantData almacena la info necesaria de cada universidad para calcular su mora
type TenantData struct {
	ID                  string  `db:"id"`
	DefaultInterestRate float64 `db:"default_interest_rate"`
}

func main() {
	log.Println("🌙 Iniciando Worker Nocturno de EduPay SaaS...")

	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ INFO: No se encontró archivo .env")
	}

	db := database.ConnectDB()
	defer db.Close()

	// 1. Obtener todas las universidades (Tenants)
	var tenants []TenantData
	err := db.Select(&tenants, `SELECT id, default_interest_rate FROM tenants`)
	if err != nil {
		log.Fatalf("❌ Error al obtener los tenants: %v", err)
	}

	log.Printf("🏢 Se encontraron %d universidades. Procesando deudas...", len(tenants))

	// 2. Configurar WaitGroup para la concurrencia
	var wg sync.WaitGroup

	// 3. Lanzar una Goroutine por cada Universidad
	for _, t := range tenants {
		wg.Add(1) // Sumamos 1 al contador por cada goroutine que iniciamos

		// Pasamos la variable 't' como parámetro para evitar problemas de closure en el bucle
		go func(tenant TenantData) {
			defer wg.Done() // Restamos 1 al terminar, pase lo que pase

			err := processTenantPenalties(db, tenant)
			if err != nil {
				log.Printf("❌ Error procesando Universidad [%s]: %v", tenant.ID, err)
			} else {
				log.Printf("✅ Universidad [%s] procesada con éxito.", tenant.ID[:8])
			}
		}(t)
	}

	// 4. Esperar a que TODAS las goroutines terminen su trabajo
	wg.Wait()
	log.Println("🏁 Worker Nocturno finalizado. Todos los intereses han sido calculados.")
}

// processTenantPenalties ejecuta el cálculo de interés simple para las cuotas vencidas
func processTenantPenalties(db *sqlx.DB, tenant TenantData) error {
	// Reutilizamos tu helper magistral para aislar la transacción por Tenant
	return database.RunInTenantTx(db, tenant.ID, func(tx *sqlx.Tx) error {

		// Lógica del Interés Simple:
		// Se actualiza penalty_amount sumándole el (Monto Original * Tasa Diaria)
		// Solo a las cuotas que están PENDING y cuya due_date ya pasó (es menor a hoy).

		query := `
			UPDATE installments 
			SET penalty_amount = penalty_amount + (amount * $1)
			WHERE status = 'PENDING' 
			AND due_date < CURRENT_DATE
		`

		result, err := tx.Exec(query, tenant.DefaultInterestRate)
		if err != nil {
			return err
		}

		rowsAffected, _ := result.RowsAffected()
		log.Printf("   -> Tenant %s: %d cuotas vencidas actualizadas.", tenant.ID[:8], rowsAffected)

		return nil
	})
}
