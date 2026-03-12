package tenant

import (
	"github.com/gofiber/fiber/v2"
)

// Middleware intercepta todas las peticiones entrantes para asegurar el aislamiento de datos.
func Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Extraemos el identificador de la universidad desde los Headers HTTP
		tenantID := c.Get("X-Tenant-ID")

		// 2. Si la petición no trae el Tenant ID, la rechazamos inmediatamente.
		// Esto evita que datos huérfanos entren a la base de datos.
		if tenantID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Missing Tenant",
				"message": "El header X-Tenant-ID es obligatorio para esta ruta",
			})
		}

		// 3. Guardamos el tenantID en la memoria de contexto de esta petición específica.
		// Fiber.Locals permite que los siguientes controladores (y la base de datos)
		// puedan leer este ID sin tener que pasarlo como parámetro en cada función.
		c.Locals("tenant_id", tenantID)

		// 4. Todo está en orden, permitimos que la petición continúe su camino
		return c.Next()
	}
}
