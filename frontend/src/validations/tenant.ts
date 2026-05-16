import { z } from "zod";

export const createTenantSchema = z.object({
  // Datos de la Universidad (Tus validaciones estrictas)
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  domain: z
    .string()
    .min(3, "El dominio debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9.-]+$/, "Solo minúsculas, números, puntos y guiones")
    .includes(".", { message: "Debe ser un dominio válido (ej: ucc.edu.co)" }),
  default_interest_rate: z.coerce
    .number()
    .min(0, "La tasa no puede ser negativa")
    .max(1, "La tasa no puede ser mayor a 1 (100%)"),

  // Datos del Administrador Principal (Nuevos campos para la transacción ACID)
  admin_full_name: z
    .string()
    .min(3, "El nombre del administrador es obligatorio"),
  admin_email: z.string().email("Ingresa un correo institucional válido"),
  admin_password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type CreateTenantFormData = z.infer<typeof createTenantSchema>;
export type CreateTenantInput = z.input<typeof createTenantSchema>;
