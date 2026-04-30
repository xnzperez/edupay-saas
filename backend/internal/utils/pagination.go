package utils

// PaginatedResponse es un DTO genérico [T any].
// La "T" significa que la propiedad Data puede ser un array de Transacciones,
// un array de Usuarios, o de cualquier otro struct que necesitemos en el futuro.
type PaginatedResponse[T any] struct {
	Data       []T `json:"data"`        // Los registros de la página actual
	Total      int `json:"total"`       // El total absoluto de registros en la BD
	Page       int `json:"page"`        // La página actual en la que estamos
	Limit      int `json:"limit"`       // Cuántos registros pedimos por página
	TotalPages int `json:"total_pages"` // El cálculo final de páginas disponibles
}

// CalculateTotalPages es una función matemática pura para calcular el techo de las páginas
func CalculateTotalPages(totalItems, limit int) int {
	if limit <= 0 {
		return 1 // Evitamos división por cero y asumimos que todo cabe en 1 página
	}

	totalPages := totalItems / limit
	// Si hay un residuo (ej. 11 items con limite de 10), necesitamos 1 página adicional
	if totalItems%limit != 0 {
		totalPages++
	}

	return totalPages
}
