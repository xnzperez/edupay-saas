package auth

import (
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Protected es el middleware que exige un JWT válido para dejar pasar la petición
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Buscar el header "Authorization"
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Falta el token de autorización en los Headers",
			})
		}

		// 2. Validar el formato estándar "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Formato de token inválido. Use 'Bearer <token>'",
			})
		}
		tokenString := parts[1]

		// 3. Obtener el secreto para desencriptar (el mismo que usamos en el login)
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_secret_for_local_dev"
		}

		// 4. Parsear y validar la firma criptográfica del token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validar que el algoritmo de firma sea el correcto (HMAC) para evitar hackeos
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token inválido o expirado. Inicie sesión nuevamente.",
			})
		}

		// 5. Extraer los datos guardados dentro del token (Claims)
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			// CROSS-CHECK DE SEGURIDAD ABSOLUTA:
			// Verificamos que el Tenant ID del token coincida con el Tenant ID de la URL/Header.
			// Así evitamos que un estudiante de la UCC intente pagar algo en la UPB.
			tokenTenantID := claims["tenant_id"].(string)
			urlTenantID := c.Locals("tenant_id").(string)

			if tokenTenantID != urlTenantID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "ALERTA: El token no pertenece a esta Universidad",
				})
			}

			// Guardamos los datos en la memoria de Fiber para que los siguientes controladores los usen
			c.Locals("user_id", claims["sub"])
			c.Locals("user_role", claims["role"])
		} else {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Estructura del token corrupta"})
		}

		// 6. ¡Todo en orden! El guardia abre la puerta.
		return c.Next()
	}
}
