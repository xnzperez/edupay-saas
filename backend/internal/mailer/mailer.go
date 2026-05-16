package mailer

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

// SendReceiptEmail envía el comprobante adjuntando el PDF generado en memoria
func SendReceiptEmail(toEmail string, studentName string, amount float64, pdfBytes []byte) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY no está configurada")
	}

	client := resend.NewClient(apiKey)

	// En el plan gratuito, el remitente obligatorio es onboarding@resend.dev
	params := &resend.SendEmailRequest{
		From:    "EduPay <onboarding@resend.dev>",
		To:      []string{toEmail},
		Subject: "Comprobante de Recarga Aprobada - EduPay",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; color: #333;">
				<h2>¡Recarga Exitosa, %s!</h2>
				<p>Tu recarga por <strong>$%v COP</strong> ha sido procesada correctamente y el saldo ya está en tu billetera.</p>
				<p>Adjuntamos el comprobante inmutable de tu transacción.</p>
				<hr>
				<p style="font-size: 12px; color: #777;">Sistema Automático de EduPay SaaS</p>
			</div>
		`, studentName, amount),
		Attachments: []*resend.Attachment{
			{
				Filename: "Comprobante_EduPay.pdf",
				Content:  pdfBytes, // Aquí inyectamos el PDF crudo directamente de la memoria
			},
		},
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error de la API de Resend: %v", err)
	}

	fmt.Printf("📧 ¡Correo con PDF enviado con éxito a %s!\n", toEmail)
	return nil
}

// SendCertificateEmail envía el certificado adjuntando el PDF generado en memoria
func SendCertificateEmail(toEmail string, studentName string, itemName string, pdfBytes []byte) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY no está configurada")
	}

	client := resend.NewClient(apiKey)

	params := &resend.SendEmailRequest{
		From:    "EduPay <onboarding@resend.dev>",
		To:      []string{toEmail},
		Subject: "Tu Certificado Digital - EduPay",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; color: #333;">
				<h2>¡Hola, %s!</h2>
				<p>Tu compra del documento <strong>"%s"</strong> ha sido procesada correctamente.</p>
				<p>Adjuntamos a este correo tu certificado digital en formato PDF.</p>
				<hr>
				<p style="font-size: 12px; color: #777;">Sistema Automático de EduPay SaaS</p>
			</div>
		`, studentName, itemName),
		Attachments: []*resend.Attachment{
			{
				Filename: "Certificado_EduPay.pdf",
				Content:  pdfBytes,
			},
		},
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error de la API de Resend: %v", err)
	}

	fmt.Printf("📧 ¡Certificado enviado con éxito a %s!\n", toEmail)
	return nil
}

// SendPasswordResetEmail envía el código OTP de 6 dígitos para recuperación de contraseña
func SendPasswordResetEmail(toEmail string, studentName string, otpCode string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY no está configurada")
	}

	client := resend.NewClient(apiKey)

	params := &resend.SendEmailRequest{
		From:    "EduPay <onboarding@resend.dev>",
		To:      []string{toEmail},
		Subject: "Código de Recuperación - EduPay SaaS",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 10px;">
				<h2 style="color: #003366; text-align: center;">Recuperación de Contraseña</h2>
				<p>Hola, <strong>%s</strong>.</p>
				<p>Hemos recibido una solicitud para restablecer tu contraseña en el sistema.</p>
				<p>Tu código de seguridad de 6 dígitos es:</p>
				<div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; border-radius: 5px; margin: 20px 0; color: #003366;">
					%s
				</div>
				<p style="font-size: 12px; color: #777; text-align: center;">Este código expirará en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>
			</div>
		`, studentName, otpCode),
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error de la API de Resend enviando OTP: %v", err)
	}

	fmt.Printf("📧 ¡Código OTP enviado con éxito a %s!\n", toEmail)
	return nil
}
