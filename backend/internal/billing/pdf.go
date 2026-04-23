package billing

import (
	"bytes"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf" // Usando tu librería existente
)

// GenerateReceiptBytes crea un PDF en RAM y retorna los bytes inmutables
func GenerateReceiptBytes(studentName string, amount float64) ([]byte, error) {
	// Inicializamos con tu librería gofpdf
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Cabecera
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Comprobante de Ingreso - EduPay SaaS")
	pdf.Ln(12)

	// Cuerpo del recibo
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, fmt.Sprintf("Fecha: %s", time.Now().Format("2006-01-02 15:04:05")))
	pdf.Ln(8)
	pdf.Cell(40, 10, fmt.Sprintf("Estudiante: %s", studentName))
	pdf.Ln(8)
	pdf.Cell(40, 10, fmt.Sprintf("Monto Acreditado: $%v COP", amount))
	pdf.Ln(8)
	pdf.Cell(40, 10, "Estado de la transaccion: APROBADA")
	pdf.Ln(15)

	pdf.SetFont("Arial", "I", 10)
	pdf.Cell(40, 10, "Documento inmutable generado automaticamente. Valido como soporte de recarga.")

	// Volcamos el PDF a un Buffer en memoria (RAM)
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
