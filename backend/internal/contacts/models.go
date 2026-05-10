package contacts

import (
	"context"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

type Contact struct {
	ID           string    `json:"id" db:"id"`
	ContactEmail string    `json:"contact_email" db:"contact_email"`
	ContactName  string    `json:"contact_name" db:"contact_name"`
	IsFavorite   bool      `json:"is_favorite" db:"is_favorite"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type SaveContactReq struct {
	ContactEmail string `json:"contact_email" validate:"required,email"`
	ContactName  string `json:"contact_name" validate:"required"`
}

func GetContacts(ctx context.Context, db *sqlx.DB, tenantID, ownerID string) ([]Contact, error) {
	var contacts []Contact
	query := `
		SELECT id, contact_email, contact_name, is_favorite, created_at
		FROM saved_contacts
		WHERE tenant_id = $1 AND owner_id = $2
		ORDER BY created_at DESC
	`
	err := db.SelectContext(ctx, &contacts, query, tenantID, ownerID)
	return contacts, err
}

func AddContact(ctx context.Context, db *sqlx.DB, tenantID, ownerID string, req SaveContactReq) error {
	// 1. Validar que el correo pertenezca a un usuario real en este tenant
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND tenant_id = $2)`
	err := db.GetContext(ctx, &exists, checkQuery, req.ContactEmail, tenantID)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("USER_NOT_FOUND")
	}

	// 2. Insertar (Forzamos is_favorite = true ya que si está aquí, es porque lo guardó)
	query := `
		INSERT INTO saved_contacts (tenant_id, owner_id, contact_email, contact_name, is_favorite)
		VALUES ($1, $2, $3, $4, true)
		ON CONFLICT (owner_id, contact_email) 
		DO UPDATE SET contact_name = EXCLUDED.contact_name
	`
	_, err = db.ExecContext(ctx, query, tenantID, ownerID, req.ContactEmail, req.ContactName)
	return err
}

// RemoveContact elimina físicamente el registro de la libreta
func RemoveContact(ctx context.Context, db *sqlx.DB, contactID, ownerID string) error {
	query := `DELETE FROM saved_contacts WHERE id = $1 AND owner_id = $2`
	_, err := db.ExecContext(ctx, query, contactID, ownerID)
	return err
}

// GetRecentContacts extrae los destinatarios únicos recientes desde wallet_txs
func GetRecentContacts(ctx context.Context, db *sqlx.DB, tenantID, ownerID string) ([]string, error) {
	var references []string
	query := `
		SELECT reference
		FROM wallet_txs
		WHERE tenant_id = $1
		  AND tx_type = 'TRANSFER_OUT'
		  AND wallet_id = (SELECT id FROM wallets WHERE user_id = $2 AND tenant_id = $1)
		GROUP BY reference
		ORDER BY MAX(created_at) DESC
		LIMIT 5
	`

	// sqlx mapea automáticamente una sola columna a un slice de strings básicos
	err := db.SelectContext(ctx, &references, query, tenantID, ownerID)
	return references, err
}
