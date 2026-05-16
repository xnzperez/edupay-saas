import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTenantSchema,
  type CreateTenantFormData,
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
  } = useForm<CreateTenantFormData>({
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
        Aprovisionamiento de Nueva Universidad
      </h2>

      {feedback.type === "success" && (
        <div className="mb-6 p-4 text-green-700 bg-green-100 rounded-md font-medium border border-green-200">
          {feedback.message}
        </div>
      )}

      {feedback.type === "error" && (
        <div className="mb-6 p-4 text-red-700 bg-red-100 rounded-md font-medium border border-red-200">
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* --- SECCIÓN 1: DATOS DE LA UNIVERSIDAD --- */}
          <div className="space-y-5 bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              1. Datos de la Institución
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Institución
              </label>
              <input
                type="text"
                placeholder="Ej: Universidad Cooperativa de Colombia"
                {...register("name")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.name
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dominio Principal
              </label>
              <input
                type="text"
                placeholder="Ej: ucc.edu.co"
                {...register("domain")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.domain
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.domain && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.domain.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa de Interés Diaria (Decimal)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="Ej: 0.0015 para 0.15%"
                {...register("default_interest_rate")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.default_interest_rate
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.default_interest_rate && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.default_interest_rate.message}
                </p>
              )}
            </div>
          </div>

          {/* --- SECCIÓN 2: DATOS DEL ADMINISTRADOR --- */}
          <div className="space-y-5 bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              2. Administrador Principal (Root Tenant)
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo del Admin
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Pérez"
                {...register("admin_full_name")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.admin_full_name
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.admin_full_name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.admin_full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                placeholder="admin@ucc.edu.co"
                {...register("admin_email")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.admin_email
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.admin_email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.admin_email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Temporal
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("admin_password")}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.admin_password
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
              {errors.admin_password && (
                <p className="mt-1 text-sm text-red-500">
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
            className="w-full md:w-1/2 mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed hover:-translate-y-0.5"
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
