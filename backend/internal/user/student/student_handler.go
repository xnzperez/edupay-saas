package student

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// EnrollStudentHandler: Permite a un Cajero matricular a un estudiante y generar su billetera.
func EnrollStudentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		type Request struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Datos de matrícula inválidos"})
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error interno de seguridad"})
		}

		tx, err := db.Beginx()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error de conexión con la DB"})
		}

		var studentID string

		// 1. Insertar en users
		userQuery := `INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) 
                      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'STUDENT') RETURNING id`

		err = tx.Get(&studentID, userQuery, tenantID, req.FullName, req.Email, string(hashedPassword))
		if err != nil {
			tx.Rollback()
			fmt.Println("Error creando estudiante:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "El correo ya se encuentra registrado"})
		}

		// 2. Insertar en wallets (CORREGIDO A current_balance)
		walletQuery := `INSERT INTO wallets (id, user_id, tenant_id, current_balance) VALUES (gen_random_uuid(), $1, $2, 0)`
		_, err = tx.Exec(walletQuery, studentID, tenantID)
		if err != nil {
			tx.Rollback()
			fmt.Println("Error FATAL creando billetera en DB:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "Error al asignar billetera"})
		}

		tx.Commit()
		return c.Status(201).JSON(fiber.Map{"message": "Estudiante matriculado con éxito", "id": studentID})
	}
}

// GetStudentsHandler: Listado de Estudiantes por Tenant (Actualizado con is_active)
func GetStudentsHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)

		type StudentResponse struct {
			ID        string `json:"id" db:"id"`
			FullName  string `json:"full_name" db:"full_name"`
			Email     string `json:"email" db:"email"`
			CreatedAt string `json:"created_at" db:"created_at"`
			IsActive  bool   `json:"is_active" db:"is_active"` // NUEVO
		}

		var students []StudentResponse

		query := `SELECT id, full_name, email, created_at, is_active 
                  FROM users 
                  WHERE tenant_id = $1 AND role = 'STUDENT'
                  ORDER BY created_at DESC`

		if err := db.Select(&students, query, tenantID); err != nil {
			fmt.Println("Error SQL en GetStudentsHandler:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "Error al listar estudiantes"})
		}

		if students == nil {
			students = []StudentResponse{}
		}

		return c.JSON(fiber.Map{"data": students})
	}
}

// UpdateStudentHandler: Edita la información básica del estudiante
func UpdateStudentHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		studentID := c.Params("id")

		type Request struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
		}

		// RLS estricto: Solo si el estudiante pertenece a la misma universidad
		query := `UPDATE users SET full_name = $1, email = $2 
                  WHERE id = $3 AND tenant_id = $4 AND role = 'STUDENT'`

		res, err := db.Exec(query, req.FullName, req.Email, studentID, tenantID)
		if err != nil {
			fmt.Println("Error actualizando estudiante:", err.Error())
			return c.Status(500).JSON(fiber.Map{"error": "Error al actualizar (¿Email ya en uso?)"})
		}

		rows, _ := res.RowsAffected()
		if rows == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Estudiante no encontrado o sin permisos"})
		}

		return c.JSON(fiber.Map{"message": "Estudiante actualizado correctamente"})
	}
}

// UpdateStudentStatusHandler: Suspende o activa el acceso del estudiante
func UpdateStudentStatusHandler(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(string)
		studentID := c.Params("id")

		type Request struct {
			IsActive bool `json:"is_active"`
		}

		var req Request
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Estado inválido"})
		}

		query := `UPDATE users SET is_active = $1 WHERE id = $2 AND tenant_id = $3 AND role = 'STUDENT'`

		res, err := db.Exec(query, req.IsActive, studentID, tenantID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error al actualizar el estado"})
		}

		rows, _ := res.RowsAffected()
		if rows == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Estudiante no encontrado o sin permisos"})
		}

		return c.JSON(fiber.Map{"message": "Estado del estudiante actualizado"})
	}
}
