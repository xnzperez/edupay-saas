package tenant

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type CreateTenantRequest struct {
	Name                string  `json:"name"`
	Domain              string  `json:"domain"`
	DefaultInterestRate float64 `json:"default_interest_rate"`
	AdminFullName       string  `json:"admin_full_name"`
	AdminEmail          string  `json:"admin_email"`
	AdminPassword       string  `json:"admin_password"`
}

func CreateTenantHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {

		userRole, _ := c.Locals("user_role").(string)
		tenantID, _ := c.Locals("tenant_id").(string)

		// === RADIOGRAFÍA DE DEPURACIÓN ===
		fmt.Println("\n--- [DEBUG] INTENTO DE APROVISIONAMIENTO ---")
		fmt.Printf("1. user_role en Locals: '%s'\n", userRole)
		fmt.Printf("2. tenant_id en Locals: '%s'\n", tenantID)
		fmt.Printf("3. Header X-Tenant-ID real: '%s'\n", c.Get("X-Tenant-ID"))
		fmt.Println("--------------------------------------------\n")

		// Comprobación dura
		if userRole != "SUPERADMIN" || tenantID != "00000000-0000-4000-8000-000000000000" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado. Credenciales de inquilino o rol insuficientes para aprovisionar.",
			})
		}

		var req CreateTenantRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "JSON inválido"})
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.AdminPassword), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error cifrando contraseña del administrador"})
		}

		tx, err := db.Beginx()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al iniciar la transacción"})
		}
		defer tx.Rollback()

		var newTenantID string
		tenantQuery := `
			INSERT INTO tenants (name, domain, default_interest_rate) 
			VALUES ($1, $2, $3) 
			RETURNING id`

		err = tx.QueryRow(tenantQuery, req.Name, req.Domain, req.DefaultInterestRate).Scan(&newTenantID)
		if err != nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":   "No se pudo registrar la Universidad. Es posible que el dominio ya exista.",
				"details": err.Error(),
			})
		}

		// 5. Insertar al Administrador asignándole el nuevo TenantID (Como SUPERADMIN Local)
		var newAdminID string
		adminQuery := `
			INSERT INTO users (tenant_id, role, email, full_name, password_hash)
			VALUES ($1, 'SUPERADMIN', $2, $3, $4)
			RETURNING id`

		err = tx.QueryRow(adminQuery, newTenantID, req.AdminEmail, req.AdminFullName, string(hashedPassword)).Scan(&newAdminID)
		if err != nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":   "No se pudo crear el administrador. ¿El correo ya está en uso?",
				"details": err.Error(),
			})
		}

		if err := tx.Commit(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al guardar los cambios"})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":   "Universidad y Administrador registrados exitosamente",
			"tenant_id": newTenantID,
			"admin_id":  newAdminID,
			"domain":    req.Domain,
		})
	}
}

func GetTenantsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		isMaster, ok := c.Locals("is_master").(bool)
		if !ok || !isMaster {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado. Solo el Root Global puede ver universidades.",
			})
		}

		type TenantResponse struct {
			ID        string `json:"id" db:"id"`
			Name      string `json:"name" db:"name"`
			IsActive  bool   `json:"is_active" db:"is_active"`
			CreatedAt string `json:"created_at" db:"created_at"`
		}

		var tenants []TenantResponse
		query := `SELECT id, name, created_at, is_active FROM tenants ORDER BY created_at DESC`

		err := db.Select(&tenants, query)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Error obteniendo los inquilinos",
				"details": err.Error(),
			})
		}

		if tenants == nil {
			tenants = []TenantResponse{}
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Universidades obtenidas exitosamente",
			"data":    tenants,
		})
	}
}

func UpdateTenantStatusHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		isMaster, ok := c.Locals("is_master").(bool)
		if !ok || !isMaster {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado. Solo el Root Global puede modificar universidades.",
			})
		}

		id := c.Params("id")
		type Request struct {
			IsActive bool `json:"is_active"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}

		query := `UPDATE tenants SET is_active = $1 WHERE id = $2`
		_, err := db.Exec(query, req.IsActive, id)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "No se pudo actualizar el estado",
				"details": err.Error(),
			})
		}

		statusMsg := "activada"
		if !req.IsActive {
			statusMsg = "suspendida"
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Universidad " + statusMsg + " correctamente",
		})
	}
}

// GetMyTenantHandler obtiene los datos de la universidad del usuario logueado.
func GetMyTenantHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		type MyTenantResponse struct {
			ID                  string  `json:"id" db:"id"`
			Name                string  `json:"name" db:"name"`
			Domain              string  `json:"domain" db:"domain"`
			DefaultInterestRate float64 `json:"default_interest_rate" db:"default_interest_rate"`
			IsActive            bool    `json:"is_active" db:"is_active"`
			CreatedAt           string  `json:"created_at" db:"created_at"`
		}

		var t MyTenantResponse
		query := `SELECT id, name, domain, default_interest_rate, is_active, created_at FROM tenants WHERE id = $1`

		if err := db.Get(&t, query, tenantID); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Universidad no encontrada"})
		}
		return c.JSON(fiber.Map{"data": t})
	}
}

// UpdateMyTenantHandler permite al SuperAdmin local editar su dominio y tasa de interés.
func UpdateMyTenantHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		type UpdateRequest struct {
			Domain              string  `json:"domain"`
			DefaultInterestRate float64 `json:"default_interest_rate"`
		}

		var req UpdateRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}

		query := `UPDATE tenants SET domain = $1, default_interest_rate = $2 WHERE id = $3`
		_, err := db.Exec(query, req.Domain, req.DefaultInterestRate, tenantID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "No se pudo actualizar la configuración"})
		}

		return c.JSON(fiber.Map{"message": "Configuración actualizada"})
	}
}
