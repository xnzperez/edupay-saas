package billing

import (
	"bytes"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
)

// GenerateReceiptBytes crea el recibo que se envía por CORREO al pagar
func GenerateReceiptBytes(studentName string, amount float64) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.AddPage()

	primaryR, primaryG, primaryB := 79, 70, 229
	darkR, darkG, darkB := 30, 41, 59

	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.Rect(0, 0, 210, 35, "F")

	pdf.SetFont("Arial", "B", 24)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(10, 12)
	pdf.CellFormat(190, 10, "EDUPAY SAAS", "", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "", 12)
	pdf.SetXY(10, 22)
	pdf.CellFormat(190, 10, tr("Recibo Oficial de Transacción"), "", 0, "C", false, 0, "")

	pdf.SetTextColor(darkR, darkG, darkB)
	pdf.SetXY(10, 50)

	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "Detalles del Pago Aprobado")
	pdf.Ln(12)

	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.5)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Estudiante:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, tr(studentName))
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Fecha:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, time.Now().Format("02/01/2006 15:04:05"))
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Estado:")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(34, 197, 94)
	pdf.Cell(0, 10, tr("APROBADA (Transacción ACID)"))
	pdf.Ln(15)

	pdf.SetTextColor(darkR, darkG, darkB)
	pdf.SetFillColor(248, 250, 252)
	pdf.Rect(10, pdf.GetY(), 190, 20, "F")

	pdf.SetFont("Arial", "B", 16)
	pdf.SetXY(15, pdf.GetY()+5)
	pdf.Cell(100, 10, "Total Pagado:")

	pdf.SetXY(95, pdf.GetY())
	pdf.CellFormat(100, 10, fmt.Sprintf("$%.2f COP", amount), "", 0, "R", false, 0, "")
	pdf.Ln(30)

	pdf.SetFont("Arial", "I", 10)
	pdf.SetTextColor(148, 163, 184)
	pdf.MultiCell(190, 6, tr("Documento digital inmutable generado automáticamente por el motor financiero de EduPay. Válido como soporte de pago ante la institución educativa."), "", "C", false)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateStatementBytes crea el comprobante que se ve al hacer clic en "DESCARGAR COMPROBANTE"
func GenerateStatementBytes(tenantName, studentName, studentEmail, description, dueDate, status string, amount, penalty float64) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.AddPage()

	primaryR, primaryG, primaryB := 79, 70, 229
	darkR, darkG, darkB := 30, 41, 59

	// Header
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.Rect(0, 0, 210, 35, "F")

	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(10, 12)
	pdf.CellFormat(190, 10, tr("ESTADO DE CUENTA - "+tenantName), "", 0, "C", false, 0, "")

	// Body
	pdf.SetTextColor(darkR, darkG, darkB)
	pdf.SetXY(10, 50)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Estudiante:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, tr(fmt.Sprintf("%s (%s)", studentName, studentEmail)))
	pdf.Ln(10)

	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.5)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Concepto:")
	pdf.SetFont("Arial", "", 12)
	pdf.MultiCell(0, 10, tr(description), "", "L", false)
	pdf.Ln(2)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, tr("Fecha Límite:"))
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, dueDate)
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Estado:")
	pdf.SetFont("Arial", "B", 12)
	if status == "PAID" {
		pdf.SetTextColor(34, 197, 94)
		status = "PAGADO"
	} else if status == "OVERDUE" {
		pdf.SetTextColor(239, 68, 68)
		status = "VENCIDO (MORA)"
	} else {
		pdf.SetTextColor(245, 158, 11)
		status = "PENDIENTE"
	}
	pdf.Cell(0, 10, status)
	pdf.Ln(15)

	// Totals Box
	pdf.SetTextColor(darkR, darkG, darkB)
	pdf.SetFillColor(248, 250, 252)
	pdf.Rect(10, pdf.GetY(), 190, 35, "F")

	pdf.SetFont("Arial", "", 12)
	pdf.SetXY(15, pdf.GetY()+5)
	pdf.Cell(100, 10, "Subtotal:")
	pdf.SetXY(95, pdf.GetY())
	pdf.CellFormat(100, 10, fmt.Sprintf("$%.2f COP", amount), "", 0, "R", false, 0, "")
	pdf.Ln(10)

	pdf.SetXY(15, pdf.GetY())
	pdf.Cell(100, 10, "Mora (Penalty):")
	pdf.SetXY(95, pdf.GetY())
	pdf.CellFormat(100, 10, fmt.Sprintf("$%.2f COP", penalty), "", 0, "R", false, 0, "")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 16)
	pdf.SetXY(15, pdf.GetY())
	pdf.Cell(100, 10, "TOTAL A PAGAR:")
	pdf.SetXY(95, pdf.GetY())
	pdf.CellFormat(100, 10, fmt.Sprintf("$%.2f COP", amount+penalty), "", 0, "R", false, 0, "")
	pdf.Ln(25)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
