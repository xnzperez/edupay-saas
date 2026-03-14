import { z } from "zod";

// Definimos el esquema estricto para el Login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo institucional es obligatorio")
    .email("Debe ser un formato de correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Extraemos el tipo de TypeScript automáticamente desde el esquema
export type LoginFormValues = z.infer<typeof loginSchema>;
