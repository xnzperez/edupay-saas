package database

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

// RunInTenantTx envuelve cualquier operación de base de datos en una transacción
// que está estrictamente aislada al Tenant ID proporcionado.
func RunInTenantTx(db *sqlx.DB, tenantID string, fn func(tx *sqlx.Tx) error) error {
	// 1. Iniciamos la transacción
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("error iniciando transacción: %v", err)
	}

	// 2. Seguridad: Si algo falla (panic) o la función retorna error, hacemos Rollback.
	defer tx.Rollback()

	// 3. ¡INYECCIÓN RLS! Le decimos a Postgres quién es el inquilino actual.
	// current_setting('app.current_tenant') leerá este valor.
	_, err = tx.Exec("SELECT set_config('app.current_tenant', $1, true)", tenantID)
	if err != nil {
		return fmt.Errorf("error inyectando tenant context: %v", err)
	}

	// 4. Ejecutamos la función de negocio (crear usuario, leer factura, etc)
	if err := fn(tx); err != nil {
		return err // El defer hará el Rollback automáticamente
	}

	// 5. Si todo salió perfecto, confirmamos los cambios
	return tx.Commit()
}
