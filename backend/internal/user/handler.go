package user

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"github.com/xnzperez/edupay-saas/internal/mailer"
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
			TenantID     *string `db:"tenant_id"`
			IsActive     bool    `db:"is_active"`
		}

		// === 1. INTERCEPCIÓN DEL SUPERADMIN MAESTRO CON DATOS REALES DE BD ===
		if req.Email == "master@edupay.com" && req.Password == "admin123" {
			fmt.Println("🔓 Bypass de SuperAdmin Maestro activado con ID de Producción")

			masterTenant := "00000000-0000-4000-8000-000000000000"

			// Forzamos los IDs reales exactos que recuperamos de Azure
			user.ID = "b6e44d64-bedd-4c8b-92fb-11292ea20e8a"
			user.Role = "SUPERADMIN"
			user.TenantID = &masterTenant
			user.IsActive = true

		} else {
			// === 2. FLUJO NORMAL: Usuarios reales de base de datos ===
			err := database.RunInTenantTx(db, requestTenantID, func(tx *sqlx.Tx) error {
				query := `SELECT id, password_hash, role, tenant_id, is_active FROM users WHERE LOWER(email) = LOWER($1)`
				return tx.Get(&user, query, req.Email)
			})

			if err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
			}

			// Validamos el estado de la cuenta en la BD
			if !user.IsActive {
				fmt.Println("❌ Intento de acceso bloqueado: Cuenta suspendida ->", req.Email)
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Tu cuenta ha sido suspendida. Contacta al administrador de tu universidad.",
				})
			}

			// Comparamos el hash Bcrypt
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
				fmt.Println("❌ Error de contraseña:", err)
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Credenciales inválidas"})
			}
		}

		// === 3. GENERACIÓN DEL TOKEN JWT ===
		var finalTenantID string
		if user.TenantID != nil {
			finalTenantID = *user.TenantID
		}

		claims := jwt.MapClaims{
			"sub":       user.ID,
			"tenant_id": finalTenantID,
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

// RequestOTPRequest define el cuerpo del JSON para pedir recuperación
type RequestOTPRequest struct {
	Email string `json:"email"`
}

// RequestPasswordResetHandler genera un OTP y lo envía al correo del usuario
func RequestPasswordResetHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RequestOTPRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		email := strings.TrimSpace(req.Email)
		if email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El correo es obligatorio"})
		}

		// 1. Buscar si el usuario existe (ignorar mayúsculas)
		var user struct {
			ID       string `db:"id"`
			FullName string `db:"full_name"`
		}

		// No usamos RunInTenantTx porque es una ruta pública y el usuario no está logueado
		query := `SELECT id, full_name FROM users WHERE LOWER(email) = LOWER($1)`
		err := db.Get(&user, query, email)
		if err != nil {
			// Por seguridad, no decimos si el correo existe o no, solo damos un "ok" falso para evitar ataques de enumeración
			fmt.Println("Alerta: Intento de recuperar contraseña de correo inexistente:", email)
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"message": "Si el correo existe en nuestro sistema, recibirá un código de recuperación.",
			})
		}

		// 2. Generar OTP criptográficamente seguro de 6 dígitos
		max := big.NewInt(1000000) // 0 a 999999
		n, _ := rand.Int(rand.Reader, max)
		otpCode := fmt.Sprintf("%06d", n.Int64()) // Asegura que siempre tenga 6 caracteres (ej. 004512)

		// 3. Guardar en la base de datos (Expiración: 15 minutos)
		// Borramos los OTPs anteriores no usados por si está pidiendo uno nuevo
		_, _ = db.Exec(`DELETE FROM password_resets WHERE user_id = $1 AND is_used = FALSE`, user.ID)

		insertQuery := `
			INSERT INTO password_resets (user_id, otp_code, expires_at)
			VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
		`
		_, err = db.Exec(insertQuery, user.ID, otpCode)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno del servidor generando OTP"})
		}

		// 4. Enviar el correo usando Resend en una Goroutine
		go func(targetEmail, name, code string) {
			// Usamos el mailer para enviar el correo (crearemos esta función en el mailer.go enseguida)
			errMail := mailer.SendPasswordResetEmail(targetEmail, name, code)
			if errMail != nil {
				fmt.Printf("❌ Error enviando correo de reseteo a %s: %v\n", targetEmail, errMail)
			}
		}(email, user.FullName, otpCode)

		// 5. Respuesta inmediata
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Si el correo existe en nuestro sistema, recibirá un código de recuperación.",
		})
	}
}

// ResetPasswordRequest define el JSON para asentar la nueva clave
type ResetPasswordRequest struct {
	Email       string `json:"email"`
	OTPCode     string `json:"otp_code"`
	NewPassword string `json:"new_password"`
}

// ResetPasswordHandler valida el OTP y cambia la contraseña encriptándola con Bcrypt
func ResetPasswordHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req ResetPasswordRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		email := strings.TrimSpace(req.Email)
		otp := strings.TrimSpace(req.OTPCode)
		newPassword := req.NewPassword

		if email == "" || otp == "" || newPassword == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Todos los campos son obligatorios"})
		}

		// 1. Obtener el usuario
		var user struct {
			ID string `db:"id"`
		}
		queryUser := `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`
		err := db.Get(&user, queryUser, email)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario no encontrado"})
		}

		// 2. Verificar si el OTP existe, pertenece al usuario, no ha sido usado y no ha expirado
		var resetRecord struct {
			ID string `db:"id"`
		}
		queryOTP := `
			SELECT id 
			FROM password_resets 
			WHERE user_id = $1 
			  AND otp_code = $2 
			  AND is_used = FALSE 
			  AND expires_at > CURRENT_TIMESTAMP
		`
		err = db.Get(&resetRecord, queryOTP, user.ID, otp)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Código OTP inválido, ya utilizado o expirado.",
			})
		}

		// 3. Cifrar la nueva contraseña usando Bcrypt (siguiendo tu estándar de registro)
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al procesar la seguridad de la contraseña"})
		}

		// 4. Ejecutar la actualización del usuario y quemar el OTP en una sola transacción local
		tx, err := db.Beginx()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno al abrir transacción"})
		}
		defer tx.Rollback() // A salvo por si algo falla

		// A) Actualizar contraseña del usuario
		updateUser := `UPDATE users SET password_hash = $1 WHERE id = $2`
		_, err = tx.Exec(updateUser, string(hashedPassword), user.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudo actualizar la contraseña"})
		}

		// B) Marcar el OTP como usado para que nadie pueda reutilizarlo (Auditoría)
		updateOTP := `UPDATE password_resets SET is_used = TRUE WHERE id = $1`
		_, err = tx.Exec(updateOTP, resetRecord.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al invalidar el código de seguridad"})
		}

		// Consolidar cambios en la base de datos de Azure
		if err := tx.Commit(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al guardar los cambios"})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión.",
		})
	}
}
