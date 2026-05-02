package database

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
)

// RunInTenantTx envuelve cualquier operación de base de datos en una transacción
// que está estrictamente aislada al Tenant ID proporcionado.
func RunInTenantTx(db *sqlx.DB, tenantID string, fn func(tx *sqlx.Tx) error) (err error) {
	// 1. Iniciamos la transacción
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("error iniciando transacción: %w", err)
	}

	// 2 y 3. Seguridad: Panic Recovery y manejo de Silent Errors en Cleanups
	defer func() {
		if p := recover(); p != nil {
			err = fmt.Errorf("panic durante la transacción: %v", p)
			// Forzamos rollback si ocurre un panic
			if rbErr := tx.Rollback(); rbErr != nil && rbErr != sql.ErrTxDone {
				err = fmt.Errorf("%w (además falló el rollback: %v)", err, rbErr)
			}
		} else {
			// Rollback seguro para limpiar recursos. Si el Commit fue exitoso, retornará sql.ErrTxDone.
			if rbErr := tx.Rollback(); rbErr != nil && rbErr != sql.ErrTxDone {
				if err != nil {
					// Preservamos el error principal (fn) y le sumamos el error del rollback
					err = fmt.Errorf("%w (además falló el rollback: %v)", err, rbErr)
				} else {
					err = fmt.Errorf("error inesperado en rollback (transacción huérfana): %w", rbErr)
				}
			}
		}
	}()

	// 3. ¡INYECCIÓN RLS! Le decimos a Postgres quién es el inquilino actual.
	// current_setting('app.current_tenant') leerá este valor.
	_, err = tx.Exec("SELECT set_config('app.current_tenant', $1, true)", tenantID)
	if err != nil {
		return fmt.Errorf("error inyectando tenant context: %w", err)
	}

	// 4. Ejecutamos la función de negocio (crear usuario, leer factura, etc)
	if err = fn(tx); err != nil {
		return err // El defer hará el Rollback automático y manejará su error
	}

	// 5. Si todo salió perfecto, confirmamos los cambios
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("error confirmando transacción: %w", err)
	}

	return nil
}
