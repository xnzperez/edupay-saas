package store

import (
	"bytes"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
)

// GenerateCertificatePDF crea el documento oficial en memoria RAM y retorna sus bytes
func GenerateCertificatePDF(studentName string, itemName string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// 1. Cabecera Institucional
	pdf.SetFont("Arial", "B", 22)
	pdf.SetTextColor(0, 51, 102) // Azul oscuro corporativo
	pdf.CellFormat(190, 20, "UNIVERSIDAD COOPERATIVA DE COLOMBIA", "0", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "I", 16)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(190, 10, "Documento Oficial", "0", 1, "C", false, 0, "")
	pdf.Ln(20)

	// 2. Cuerpo del Certificado
	pdf.SetFont("Arial", "", 14)
	pdf.SetTextColor(0, 0, 0)
	body := fmt.Sprintf("El sistema central de EduPay hace constar que el estudiante:\n\n%s\n\nha adquirido exitosamente el documento correspondiente a:\n%s.", studentName, itemName)

	pdf.MultiCell(190, 10, body, "0", "C", false)
	pdf.Ln(30)

	// 3. Sello de Tiempo y Autenticidad
	pdf.SetFont("Arial", "I", 11)
	dateStr := time.Now().Format("02/01/2006 15:04:05")
	pdf.CellFormat(190, 10, "Fecha de expedicion automatizada: "+dateStr, "0", 1, "C", false, 0, "")
	pdf.CellFormat(190, 10, "Valido y verificado por EduPay SaaS", "0", 1, "C", false, 0, "")

	// 4. Volcado a Buffer (RAM)
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("error compilando el pdf: %v", err)
	}

	return buf.Bytes(), nil
}
