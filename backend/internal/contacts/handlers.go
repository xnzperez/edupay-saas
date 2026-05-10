package contacts

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

func GetContactsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, _ := c.Locals("tenant_id").(string)
		ownerID, _ := c.Locals("user_id").(string)

		contacts, err := GetContacts(c.Context(), db, tenantID, ownerID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudieron obtener los contactos"})
		}
		if contacts == nil {
			contacts = []Contact{}
		}
		return c.JSON(fiber.Map{"data": contacts})
	}
}

func AddContactHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		ownerID := c.Locals("user_id").(string)

		var req SaveContactReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload inválido"})
		}

		if err := AddContact(c.Context(), db, tenantID, ownerID, req); err != nil {
			if err.Error() == "USER_NOT_FOUND" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "El correo ingresado no pertenece a ningún usuario del sistema."})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al guardar el contacto"})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Contacto guardado exitosamente"})
	}
}

// RemoveContactHandler maneja DELETE /api/contacts/:id
func RemoveContactHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ownerID := c.Locals("user_id").(string)
		contactID := c.Params("id")

		if err := RemoveContact(c.Context(), db, contactID, ownerID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al eliminar el contacto"})
		}
		return c.JSON(fiber.Map{"message": "Contacto eliminado de la libreta"})
	}
}

// GetRecentContactsHandler maneja GET /api/contacts/recent
func GetRecentContactsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, _ := c.Locals("tenant_id").(string)
		ownerID, _ := c.Locals("user_id").(string)

		recent, err := GetRecentContacts(c.Context(), db, tenantID, ownerID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudieron obtener las transferencias recientes"})
		}

		if recent == nil {
			recent = []string{}
		}

		return c.JSON(fiber.Map{"data": recent})
	}
}
