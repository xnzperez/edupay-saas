import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTenantSchema,
  type CreateTenantFormData,
} from "../../validations/tenant";
import { tenantService } from "../../services/tenant";

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
    },
  });

  const onSubmit = async (data: CreateTenantFormData) => {
    setFeedback({ type: null, message: "" });
    try {
      const response = await tenantService.createTenant(data);
      setFeedback({
        type: "success",
        message: `¡Universidad registrada! ID: ${response.tenant_id}`,
      });
      reset(); // Limpiamos el formulario tras el éxito
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          (error.response?.data?.message || error.response?.data?.error) ||
          "Error de red o servidor no disponible",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Registrar Nueva Universidad
      </h2>

      {feedback.type === "success" && (
        <div className="mb-4 p-4 text-green-700 bg-green-100 rounded-md font-medium">
          {feedback.message}
        </div>
      )}

      {feedback.type === "error" && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md font-medium">
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Campo: Nombre */}
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
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Campo: Dominio */}
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
            <p className="mt-1 text-sm text-red-500">{errors.domain.message}</p>
          )}
        </div>

        {/* Campo: Tasa de Interés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tasa de Interés Diaria de Mora (Decimal)
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
          <p className="mt-1 text-xs text-gray-500">
            Ejemplo: Escribe 0.025 para un 2.5% diario.
          </p>
        </div>

        {/* Botón de Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-blue-400"
        >
          {isSubmitting ? "Registrando..." : "Crear Universidad"}
        </button>
      </form>
    </div>
  );
}
