package user

import (
	"fmt"
	"os"
	"strings"
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

// LoginHandler verifica credenciales y emite un JWT.
// @Summary Iniciar sesión en el sistema
// @Description Autentica a un usuario validando sus credenciales y devuelve un token JWT.
// @Tags Autenticación
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "ID de la Universidad (UUID)"
// @Param credentials body LoginRequest true "Credenciales del usuario (Email y Contraseña)"
// @Success 200 {object} map[string]interface{} "Login exitoso con token"
// @Failure 400 {object} map[string]interface{} "JSON inválido"
// @Failure 401 {object} map[string]interface{} "Credenciales incorrectas"
// @Router /users/login [post]
func LoginHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		// Obtenemos el tenantID del middleware (lo que manda el frontend)
		requestTenantID, ok := c.Locals("tenant_id").(string)
		if !ok || requestTenantID == "" {
			requestTenantID = ""
		}

		var user struct {
			ID           string  `db:"id"`
			PasswordHash string  `db:"password_hash"`
			Role         string  `db:"role"`
			TenantID     *string `db:"tenant_id"` // Aquí lo capturaremos de la BD
			IsActive     bool    `db:"is_active"`
		}

		var err error

		// EXCEPCIÓN SUPER ADMIN ROOT QUEMADO
		if req.Email == "root@edupay.saas" {
			query := `SELECT id, password_hash, role, tenant_id, is_active FROM users WHERE email = $1`
			err = db.Get(&user, query, req.Email)
		} else {
			// FLUJO NORMAL: Usuarios reales de base de datos
			err = database.RunInTenantTx(db, requestTenantID, func(tx *sqlx.Tx) error {
				// CORRECCIÓN CLAVE 1: Agregamos tenant_id al SELECT
				query := `SELECT id, password_hash, role, tenant_id, is_active FROM users WHERE email = $1`
				return tx.Get(&user, query, req.Email)
			})
		}

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
		}

		// CORRECCIÓN CLAVE 2: La Base de Datos es la única fuente de verdad.
		// Sobrescribimos el ID del frontend con el ID real de Postgres.
		var finalTenantID string
		if user.TenantID != nil {
			finalTenantID = *user.TenantID
		}

		// === BARRERA DE SEGURIDAD: VALIDACIÓN DE ESTADO ===
		if !user.IsActive {
			fmt.Println("❌ Intento de acceso bloqueado: Cuenta suspendida ->", req.Email)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tu cuenta ha sido suspendida. Contacta al administrador de tu universidad.",
			})
		}

		// 2. Comparamos la contraseña en texto plano con el hash de la BD
		if req.Email == "root@edupay.saas" && req.Password == "root123" {
			fmt.Println("🔓 Bypass de SuperAdmin activado")
		} else if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			fmt.Println("❌ Error de contraseña:", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
		}

		// 3. Generamos el JWT usando el finalTenantID de la BD
		claims := jwt.MapClaims{
			"sub":       user.ID,
			"tenant_id": finalTenantID, // <--- AHORA SÍ USA EL ID CORRECTO
			"role":      user.Role,
			"exp":       time.Now().Add(time.Hour * 24).Unix(),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_secret_for_local_dev"
		}

		t, err := token.SignedString([]byte(secret))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando token"})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Login exitoso",
			"token":   t,
			"role":    user.Role,
		})
	}
}

// SearchStudentHandler busca un estudiante por su correo y devuelve sus datos y saldo
func SearchStudentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Limpiamos espacios invisibles por si acaso
		email := strings.TrimSpace(c.Query("email"))
		if email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El parámetro email es requerido"})
		}

		tenantID := c.Locals("tenant_id").(string)

		// EL CHISMOSO: Esto saldrá en tu terminal negra de Go
		fmt.Println("\n--- INICIANDO BÚSQUEDA ---")
		fmt.Println("Email a buscar  :", email)
		fmt.Println("Tenant (UCC) ID :", tenantID)

		var result struct {
			ID      string  `json:"id" db:"id"`
			Name    string  `json:"name" db:"full_name"`
			Email   string  `json:"email" db:"email"`
			Balance float64 `json:"balance" db:"current_balance"`
			Status  string  `json:"status"`
		}

		err := database.RunInTenantTx(db, tenantID, func(tx *sqlx.Tx) error {
			// Blindaje total: Ignora mayúsculas/minúsculas en correo y rol
			query := `
				SELECT u.id, u.full_name, u.email, w.current_balance
				FROM users u
				JOIN wallets w ON u.id = w.user_id
				WHERE LOWER(u.email) = LOWER($1) AND UPPER(u.role) = 'STUDENT'
			`
			return tx.Get(&result, query, email)
		})

		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Estudiante no encontrado"})
		}

		result.Status = "ACTIVE"
		return c.Status(fiber.StatusOK).JSON(result)
	}
}
