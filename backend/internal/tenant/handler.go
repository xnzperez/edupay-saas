package tenant

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// Estructura para leer el JSON que nos envían desde Postman/Frontend
type CreateTenantRequest struct {
	Name                string  `json:"name"`
	Domain              string  `json:"domain"`
	DefaultInterestRate float64 `json:"default_interest_rate"`
}

// Handler para crear una nueva Universidad (Ruta de Super Admin)
func CreateTenantHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req CreateTenantRequest

		// 1. Validar que el JSON esté bien formado
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "JSON inválido",
			})
		}

		// 2. Insertar en la base de datos.
		// Nota: Usamos db.QueryRow directamente (sin RunInTenantTx) porque
		// los Tenants están un nivel por encima del RLS.
		var newTenantID string
		query := `
			INSERT INTO tenants (name, domain, default_interest_rate) 
			VALUES ($1, $2, $3) 
			RETURNING id`

		err := db.QueryRow(query, req.Name, req.Domain, req.DefaultInterestRate).Scan(&newTenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "No se pudo registrar la Universidad (¿el dominio ya existe?)",
				"details": err.Error(),
			})
		}

		// 3. Devolver éxito con el ID recién creado
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":   "Universidad registrada exitosamente",
			"tenant_id": newTenantID,
			"domain":    req.Domain,
		})
	}
}

// GetTenantsHandler devuelve la lista de todas las universidades (Tenants).
// PROTEGIDO: SOLO el Master SuperAdmin puede ejecutar esto.
func GetTenantsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Verificación de seguridad absoluta (Solo el Maestro pasa)
		isMaster, ok := c.Locals("is_master").(bool)
		if !ok || !isMaster {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado. Solo el administrador maestro del SaaS puede ver todas las universidades.",
			})
		}

		// 2. Estructura para mapear la respuesta de la base de datos
		type TenantResponse struct {
			ID        string `json:"id" db:"id"`
			Name      string `json:"name" db:"name"`
			IsActive  bool   `json:"is_active" db:"is_active"`
			CreatedAt string `json:"created_at" db:"created_at"`
		}

		var tenants []TenantResponse

		// 3. Query limpia (El Maestro tiene derecho a ver toda la tabla)
		query := `
			SELECT id, name, created_at, is_active 
			FROM tenants 
			ORDER BY created_at DESC
		`

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

// UpdateTenantStatusHandler permite activar o suspender una universidad.
// Solo el Maestro puede ejecutar esto.
func UpdateTenantStatusHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Verificación Maestro (Igual que en GetTenants)
		isMaster, ok := c.Locals("is_master").(bool)
		if !ok || !isMaster {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado. Solo el administrador maestro puede modificar universidades.",
			})
		}

		id := c.Params("id")

		// Estructura para recibir el nuevo estado
		type Request struct {
			IsActive bool `json:"is_active"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}

		// En un SaaS real, podrías tener una columna 'is_active' (BOOLEAN)
		// Si aún no la tienes, esta query fallará, pero es el estándar.
		query := `UPDATE tenants SET is_active = $1 WHERE id = $2`

		_, err := db.Exec(query, req.IsActive, id)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "No se pudo actualizar el estado de la universidad",
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
		query := `SELECT id, name, domain, default_interest_rate, is_active, created_at 
                  FROM tenants WHERE id = $1`

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
			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo de petición inválido"})
		}

		query := `UPDATE tenants 
                  SET domain = $1, default_interest_rate = $2 
                  WHERE id = $3`

		_, err := db.Exec(query, req.Domain, req.DefaultInterestRate, tenantID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "No se pudo actualizar la configuración"})
		}

		return c.JSON(fiber.Map{"message": "Configuración de universidad actualizada"})
	}
}
