package student

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// GetAdminsHandler: Listado de Cajeros/Administradores por Tenant
func GetAdminsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		type AdminResponse struct {
			ID        string `json:"id" db:"id"`
			FullName  string `json:"full_name" db:"full_name"`
			Email     string `json:"email" db:"email"`
			Role      string `json:"role" db:"role"`
			CreatedAt string `json:"created_at" db:"created_at"`
			IsActive  bool   `json:"is_active" db:"is_active"` // Asegurado en el struct
		}

		var admins []AdminResponse

		// 1. Añadimos is_active al SELECT.
		// 2. Quitamos el filtro de estado para que pueda ver a los suspendidos.
		query := `SELECT id, full_name, email, role, created_at, is_active 
                  FROM users 
                  WHERE tenant_id = $1 AND role = 'ADMIN'
                  ORDER BY created_at DESC`

		if err := db.Select(&admins, query, tenantID); err != nil {
			fmt.Println("Error SQL en GetAdminsHandler:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "Error al listar cajeros"})
		}

		if admins == nil {
			admins = []AdminResponse{}
		}

		return c.JSON(fiber.Map{"data": admins})
	}
}

// CreateAdminHandler: Registro de nuevos Cajeros/Administradores (Sin Billetera)
func CreateAdminHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		type Request struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error al procesar credenciales"})
		}

		// Insertamos directamente con rol ADMIN (No necesitamos transacción porque no creamos wallet)
		var adminID string
		query := `INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) 
                  VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ADMIN') RETURNING id`

		err = db.Get(&adminID, query, tenantID, req.FullName, req.Email, string(hashedPassword))
		if err != nil {
			fmt.Println("Error creando cajero:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "El correo ya existe o error interno"})
		}

		return c.Status(201).JSON(fiber.Map{
			"message": "Cajero registrado con éxito",
			"id":      adminID,
		})
	}
}

// UpdateAdminStatusHandler: Suspende o activa el acceso de un Cajero
func UpdateAdminStatusHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		adminID := c.Params("id") // ID del cajero a suspender

		type Request struct {
			IsActive bool `json:"is_active"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Estado inválido"})
		}

		// Actualizamos solo si pertenece al mismo tenant y es un ADMIN
		query := `UPDATE users SET is_active = $1 WHERE id = $2 AND tenant_id = $3 AND role = 'ADMIN'`

		res, err := db.Exec(query, req.IsActive, adminID, tenantID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error al actualizar el estado"})
		}

		rows, _ := res.RowsAffected()
		if rows == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Cajero no encontrado o sin permisos"})
		}

		return c.JSON(fiber.Map{"message": "Estado del cajero actualizado"})
	}
}
