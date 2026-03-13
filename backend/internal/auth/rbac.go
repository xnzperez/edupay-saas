package auth

import "github.com/gofiber/fiber/v2"

// RequireRole crea un middleware que restringe el acceso a una lista de roles permitidos.
// Se usa la sintaxis variádica (...string) para poder pasarle uno o varios roles.
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Recuperamos el rol del usuario que el middleware JWT guardó previamente
		userRole, ok := c.Locals("user_role").(string)

		if !ok || userRole == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "No se pudo determinar el rol del usuario. Sesión inválida.",
			})
		}

		// 2. Verificamos si el rol del usuario está en la lista VIP de esta ruta
		for _, role := range allowedRoles {
			if role == userRole {
				// El rol coincide, el guardia lo deja pasar a la lógica de negocio
				return c.Next()
			}
		}

		// 3. Si el ciclo termina y no hubo coincidencia, se bloquea la petición
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Acceso denegado. No tienes los permisos suficientes para realizar esta acción.",
		})
	}
}
