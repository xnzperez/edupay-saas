package user

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"github.com/xnzperez/edupay-saas/pkg/database"
)

// Estructura del JSON que enviará el Frontend
type RegisterRequest struct {
	Role     string `json:"role"` // ADMIN o STUDENT
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
}

func RegisterHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RegisterRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		// 1. Extraemos el Tenant ID que el Middleware inyectó y verificó previamente
		tenantID := c.Locals("tenant_id").(string)

		// 2. Hashear la contraseña con bcrypt
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error cifrando contraseña"})
		}

		var newUserID string

		// 3. Ejecutar la inserción dentro de la transacción blindada (RLS)
		err = database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			query := `
				INSERT INTO users (tenant_id, role, email, full_name, password_hash)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id`

			// Si intentamos meter un tenant_id distinto al del entorno RLS, Postgres bloqueará la consulta
			return tx.QueryRow(query, tenantID, req.Role, req.Email, req.FullName, string(hashedPassword)).Scan(&newUserID)
		})

		// 4. Manejo de errores (ej: si el email ya existe en esta universidad)
		if err != nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":   "No se pudo registrar el usuario",
				"details": err.Error(),
			})
		}

		// 5. Retornar éxito
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "Usuario registrado exitosamente en la Universidad",
			"user_id": newUserID,
			"role":    req.Role,
		})
	}
}
