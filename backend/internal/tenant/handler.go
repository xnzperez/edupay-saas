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
