package user

import (
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
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
			// A) Insertar al Usuario
			userQuery := `
				INSERT INTO users (tenant_id, role, email, full_name, password_hash)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id`

			if err := tx.QueryRow(userQuery, tenantID, req.Role, req.Email, req.FullName, string(hashedPassword)).Scan(&newUserID); err != nil {
				return err // Si falla el usuario, abortamos
			}

			// B) Crear su Billetera (Wallet) automáticamente con saldo 0.00
			walletQuery := `
				INSERT INTO wallets (user_id, tenant_id, current_balance)
				VALUES ($1, $2, 0.00)`

			if _, err := tx.Exec(walletQuery, newUserID, tenantID); err != nil {
				return err // Si falla la billetera, el usuario creado arriba se borra (Rollback)
			}

			return nil // Todo salió perfecto, hacemos Commit de ambos
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

// LoginRequest define las credenciales que enviará el cliente
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginHandler verifica credenciales y emite un JWT
func LoginHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		// El Tenant ID ya viene validado por nuestro middleware de Tenant
		tenantID := c.Locals("tenant_id").(string)

		// Estructura temporal para guardar los datos del usuario extraídos de la BD
		var user struct {
			ID           string `db:"id"`
			PasswordHash string `db:"password_hash"`
			Role         string `db:"role"`
		}

		// 1. Buscamos el email estrictamente dentro del Tenant actual (Aislamiento RLS)
		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			query := `SELECT id, password_hash, role FROM users WHERE email = $1`
			return tx.Get(&user, query, req.Email)
		})

		if err != nil {
			// Nota de seguridad: Usamos un mensaje genérico para no dar pistas a atacantes
			// sobre si el email existe o no.
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
		}

		// 2. Comparamos la contraseña en texto plano con el hash de la BD
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
		}

		// 3. Generamos el JWT (El pasaporte digital)
		// Los "Claims" son la información pública que viaja dentro del token
		claims := jwt.MapClaims{
			"sub":       user.ID,                               // Subject: ID del usuario
			"tenant_id": tenantID,                              // Para saber a qué U pertenece
			"role":      user.Role,                             // STUDENT o ADMIN
			"exp":       time.Now().Add(time.Hour * 24).Unix(), // Expira en 24 horas
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

		// 4. Firmamos el token con nuestro secreto del archivo .env
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_secret_for_local_dev" // Respaldo por si el .env falla
		}

		t, err := token.SignedString([]byte(secret))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando token"})
		}

		// 5. Retornamos el JWT al cliente
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Login exitoso",
			"token":   t,
		})
	}
}
