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
func GetTenantsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Estructura para mapear la respuesta de la base de datos (Ahora con IsActive)
		type TenantResponse struct {
			ID        string `json:"id" db:"id"`
			Name      string `json:"name" db:"name"`
			IsActive  bool   `json:"is_active" db:"is_active"`
			CreatedAt string `json:"created_at" db:"created_at"`
		}

		var tenants []TenantResponse

		// 2. Query que extrae los datos, incluyendo is_active
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

		// 3. Si no hay inquilinos, devolvemos un array vacío en lugar de null
		if tenants == nil {
			tenants = []TenantResponse{}
		}

		// 4. Retornamos el JSON al frontend
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Universidades obtenidas exitosamente",
			"data":    tenants,
		})
	}
}

// UpdateTenantStatusHandler permite activar o suspender una universidad.
func UpdateTenantStatusHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
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
