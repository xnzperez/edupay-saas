package store

import "errors"

// Item representa un producto o servicio comprable en la universidad
type Item struct {
	ID    string
	Name  string
	Price float64
}

// Catalog es nuestra base de datos en memoria para los productos del MVP.
// Permite acceso O(1) y evita migraciones innecesarias en esta fase.
var Catalog = map[string]Item{
	"cert_estudio":     {ID: "cert_estudio", Name: "Certificado de Estudio", Price: 15000.00},
	"cert_notas":       {ID: "cert_notas", Name: "Certificado de Notas", Price: 20000.00},
	"derecho_grado":    {ID: "derecho_grado", Name: "Derechos de Grado", Price: 350000.00},
	"carnet_duplicado": {ID: "carnet_duplicado", Name: "Duplicado de Carnet", Price: 25000.00},
	"val_ingles":       {ID: "val_ingles", Name: "Validación de Inglés", Price: 45000.00},
	"seguro_acc":       {ID: "seguro_acc", Name: "Seguro Estudiantil", Price: 12000.00},
}

// PurchaseRequest es el DTO (Data Transfer Object) que React nos enviará
type PurchaseRequest struct {
	ItemID string `json:"item_id" validate:"required"`
}

// Validate encapsula la lógica de validación de la solicitud antes de tocar la BD
func (req *PurchaseRequest) Validate() error {
	if req.ItemID == "" {
		return errors.New("el id del item es obligatorio")
	}

	if _, exists := Catalog[req.ItemID]; !exists {
		return errors.New("el item solicitado no existe en el catálogo")
	}

	return nil
}
