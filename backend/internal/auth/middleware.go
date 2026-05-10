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

		// 3. Obtener el secreto para desencriptar
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_secret_for_local_dev"
		}

		// 4. Parsear y validar la firma criptográfica
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
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

			// EXTRAEMOS EL ROL PRIMERO
			userRole := claims["role"].(string)
			tokenTenantID := claims["tenant_id"].(string)

			// ID DEL MAESTRO (Idealmente cárgalo con os.Getenv("MASTER_TENANT_ID"))
			masterTenantID := "88619ff3-06a0-4993-979b-99053fb5e0f6"

			// CROSS-CHECK DE SEGURIDAD ABSOLUTA:
			isMasterAdmin := userRole == "SUPERADMIN" && tokenTenantID == masterTenantID

			if !isMasterAdmin {
				// Si es un SuperAdmin local, Cajero o Estudiante, lo enjaulamos en su Tenant
				var urlTenantID string
				if val := c.Locals("tenant_id"); val != nil {
					urlTenantID = val.(string)
				}

				if urlTenantID != "" && tokenTenantID != urlTenantID {
					return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
						"error": "ALERTA: Acceso denegado. Intento de brecha de seguridad entre universidades.",
					})
				}
			}

			// 6. Guardamos los datos en la memoria de Fiber
			c.Locals("user_id", claims["sub"])
			c.Locals("user_role", userRole)
			c.Locals("tenant_id", tokenTenantID)
			c.Locals("is_master", isMasterAdmin) // Guardamos esta bandera para usarla en los handlers

		} else {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Estructura del token corrupta"})
		}

		// 7. ¡Todo en orden! El guardia abre la puerta.
		return c.Next()
	}
}
