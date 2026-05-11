package store

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

// ProcessPurchase procesa la compra asegurando atomicidad y retorna los datos del estudiante
func ProcessPurchase(db *sqlx.DB, userID string, itemID string) (string, string, error) {
	// 1. Extraemos el item de nuestro catálogo
	item, exists := Catalog[itemID]
	if !exists {
		return "", "", fmt.Errorf("el item solicitado no es valido")
	}

	// 2. Iniciamos la transacción ACID
	tx, err := db.Beginx()
	if err != nil {
		return "", "", fmt.Errorf("error iniciando transaccion: %v", err)
	}
	defer tx.Rollback()

	// 3. Bloqueo de fila (FOR UPDATE) + JOIN con la tabla users
	var currentBalance float64
	var walletID string
	var studentName string
	var studentEmail string
	var tenantID string // NUEVO: Variable para capturar el ID de la universidad

	// CORRECCIÓN 1: Agregamos w.tenant_id al SELECT
	err = tx.QueryRowx(`
		SELECT w.id, w.current_balance, u.full_name, u.email, w.tenant_id
		FROM wallets w
		JOIN users u ON w.user_id = u.id
		WHERE w.user_id = $1 FOR UPDATE`, userID).Scan(&walletID, &currentBalance, &studentName, &studentEmail, &tenantID)

	if err != nil {
		return "", "", fmt.Errorf("error obteniendo datos transaccionales: %v", err)
	}

	// 4. Validación de negocio
	if currentBalance < item.Price {
		return "", "", fmt.Errorf("fondos insuficientes: saldo $%.2f, requerido $%.2f", currentBalance, item.Price)
	}

	// 5. Deducción del saldo
	_, err = tx.Exec(`
		UPDATE wallets 
		SET current_balance = current_balance - $1 
		WHERE id = $2`, item.Price, walletID)
	if err != nil {
		return "", "", fmt.Errorf("error descontando el saldo: %v", err)
	}

	// 5.5 Registro de Auditoría (El Recibo en el historial)
	// CORRECCIÓN 2: Incluimos tenant_id en el INSERT
	_, err = tx.Exec(`
		INSERT INTO wallet_txs (wallet_id, tenant_id, tx_type, amount, reference) 
		VALUES ($1, $2, 'PURCHASE', $3, $4)`,
		walletID, tenantID, item.Price, fmt.Sprintf("Compra en tienda: %s", item.Name))
	if err != nil {
		return "", "", fmt.Errorf("error registrando la transacción en el historial: %v", err)
	}

	// 6. Confirmación (Commit)
	if err := tx.Commit(); err != nil {
		return "", "", fmt.Errorf("error confirmando la compra: %v", err)
	}

	// 7. Retornamos los datos necesarios para el PDF y el correo
	return studentName, studentEmail, nil
}
