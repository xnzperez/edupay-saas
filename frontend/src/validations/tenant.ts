import { z } from "zod";

export const createTenantSchema = z.object({
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
});

export type CreateTenantFormData = z.infer<typeof createTenantSchema>;
