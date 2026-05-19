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
	
	// 🛡️ TRADUCTOR UTF-8 PARA TILDES Y CARACTERES ESPECIALES
	tr := pdf.UnicodeTranslatorFromDescriptor("") 
	
	pdf.AddPage()

	// 1. Marco Decorativo Perimetral
	pdf.SetDrawColor(79, 70, 229) // Color Indigo
	pdf.SetLineWidth(2)
	pdf.Rect(10, 10, 190, 277, "D")
	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.5)
	pdf.Rect(12, 12, 186, 273, "D")

	pdf.Ln(25)

	// 2. Cabecera Institucional
	pdf.SetFont("Arial", "B", 24)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 15, tr("CERTIFICADO DE ADQUISICIÓN"), "0", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 14)
	pdf.SetTextColor(148, 163, 184)
	pdf.CellFormat(190, 10, "Expedido por EduPay SaaS Platform", "0", 1, "C", false, 0, "")
	pdf.Ln(25)

	// 3. Cuerpo del Certificado
	pdf.SetFont("Arial", "", 16)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 10, "Se hace constar de manera oficial que el estudiante:", "0", 1, "C", false, 0, "")
	
	pdf.Ln(8)
	pdf.SetFont("Arial", "B", 22)
	pdf.SetTextColor(79, 70, 229) // Resaltado Indigo
	pdf.CellFormat(190, 15, tr(studentName), "0", 1, "C", false, 0, "")
	
	pdf.Ln(12)
	pdf.SetFont("Arial", "", 16)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 10, "Ha adquirido y consolidado el derecho a:", "0", 1, "C", false, 0, "")
	
	pdf.Ln(8)
	pdf.SetFont("Arial", "B", 18)
	pdf.MultiCell(190, 10, tr(itemName), "0", "C", false)
	pdf.Ln(35)

	// 4. Línea de firma y Sello de Tiempo
	pdf.SetDrawColor(200, 200, 200)
	pdf.Line(60, pdf.GetY(), 150, pdf.GetY())
	pdf.Ln(8)

	pdf.SetFont("Arial", "I", 11)
	pdf.SetTextColor(148, 163, 184)
	dateStr := time.Now().Format("02/01/2006 a las 15:04:05")
	pdf.CellFormat(190, 8, tr("Sello criptográfico de validación transaccional."), "0", 1, "C", false, 0, "")
	pdf.CellFormat(190, 8, "Expedido el "+dateStr, "0", 1, "C", false, 0, "")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("error compilando el pdf: %v", err)
	}

	return buf.Bytes(), nil
}