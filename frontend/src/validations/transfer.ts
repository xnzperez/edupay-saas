import { z } from "zod";

export const transferSchema = z.object({
  // Validación estricta para el correo del destinatario
  to_email: z
    .string()
    .min(1, "El correo del destinatario es obligatorio")
    .email("Debe ser un formato de correo válido"),

  // Validación estricta para el dinero
  amount: z
    .number({ invalid_type_error: "El monto debe ser un número válido" })
    .min(1, "El monto mínimo a transferir es $1 COP")
    .int("El monto no puede tener decimales"),
});

export type TransferFormValues = z.infer<typeof transferSchema>;
