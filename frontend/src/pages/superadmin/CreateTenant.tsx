import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTenantSchema,
  type CreateTenantFormData,
  type CreateTenantInput,
} from "../../validations/tenant";
import { tenantService } from "../../services/tenant";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function CreateTenant() {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTenantInput, any, CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      domain: "",
      default_interest_rate: 0.0,
      admin_full_name: "",
      admin_email: "",
      admin_password: "",
    },
  });

  const addNotification = useNotificationStore((s) => s.addNotification);

  const onSubmit = async (data: CreateTenantFormData) => {
    setFeedback({ type: null, message: "" });
    try {
      const response = await tenantService.createTenant(data);

      setFeedback({
        type: "success",
        message: `¡Éxito! Universidad registrada (ID: ${response.tenant_id}) y Administrador creado (ID: ${response.admin_id}).`,
      });

      // --- DISPARO DE NOTIFICACIÓN GLOBAL ---
      addNotification(
        "Nueva Universidad",
        `Se ha registrado la institución ${data.name} y su administrador.`,
        "success",
      );
      sileo.success({
        title: "Aprovisionamiento Exitoso",
        description: `Se ha registrado correctamente la institución ${data.name}.`,
      });

      reset();
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.details ||
          "Error de red o servidor no disponible",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-surface rounded-xl border border-line shadow-sm mt-10">
      <h2 className="text-2xl font-bold text-foreground mb-6 border-b border-line pb-4">
        Aprovisionamiento de Nueva Universidad
      </h2>

      {feedback.type === "success" && (
        <div className="mb-6 p-4 text-success bg-success/10 rounded-xl font-medium border border-success/20">
          {feedback.message}
        </div>
      )}

      {feedback.type === "error" && (
        <div className="mb-6 p-4 text-danger bg-danger/10 rounded-xl font-medium border border-danger/20">
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* --- SECCIÓN 1: DATOS DE LA UNIVERSIDAD --- */}
          <div className="space-y-5 bg-background p-5 rounded-xl border border-line">
            <h3 className="text-lg font-bold text-foreground border-b border-line pb-2">
              1. Datos de la Institución
            </h3>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Nombre de la Institución
              </label>
              <input
                type="text"
                placeholder="Ej: Universidad Cooperativa de Colombia"
                {...register("name")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.name
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Dominio Principal
              </label>
              <input
                type="text"
                placeholder="Ej: ucc.edu.co"
                {...register("domain")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.domain
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.domain && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.domain.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Tasa de Interés Diaria (Decimal)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="Ej: 0.0015 para 0.15%"
                {...register("default_interest_rate")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.default_interest_rate
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.default_interest_rate && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.default_interest_rate.message}
                </p>
              )}
            </div>
          </div>

          {/* --- SECCIÓN 2: DATOS DEL ADMINISTRADOR --- */}
          <div className="space-y-5 bg-background p-5 rounded-xl border border-line">
            <h3 className="text-lg font-bold text-foreground border-b border-line pb-2">
              2. Administrador Principal (Root Tenant)
            </h3>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Nombre Completo del Admin
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Pérez"
                {...register("admin_full_name")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.admin_full_name
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.admin_full_name && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.admin_full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                placeholder="admin@ucc.edu.co"
                {...register("admin_email")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.admin_email
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.admin_email && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.admin_email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Contraseña Temporal
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("admin_password")}
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:ring-1 focus:outline-none transition-all duration-200 ${
                  errors.admin_password
                    ? "border-danger focus:ring-danger/20 focus:border-danger"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.admin_password && (
                <p className="mt-1 text-sm text-danger font-semibold">
                  {errors.admin_password.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Botón de Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-1/2 mx-auto block bg-primary hover:bg-primary-hover text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50 hover:-translate-y-0.5"
          >
            {isSubmitting
              ? "Ejecutando transacción ACID..."
              : "Aprovisionar Universidad"}
          </button>
        </div>
      </form>
    </div>
  );
}
