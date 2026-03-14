import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { sendTransfer } from "../services/wallet";
import {
  transferSchema,
  type TransferFormValues,
} from "../validations/transfer";

export default function Transfer() {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);

  // Inicializamos React Hook Form conectado a Zod
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  // onSubmit solo se ejecuta si Zod aprueba todas las reglas
  const onSubmit = async (data: TransferFormValues) => {
    setIsSending(true);

    try {
      const response = await sendTransfer(data);

      // Alerta de éxito con la sintaxis correcta
      sileo.success({
        title: "¡Transferencia exitosa!",
        description:
          response.message || `Has enviado $${data.amount} a ${data.to_email}`,
      });

      // Como no hay errores, el código continúa y ejecuta la redirección
      navigate("/dashboard");
    } catch (error: any) {
      // Alerta de error con la sintaxis correcta
      sileo.error({
        title: "Transferencia rechazada",
        description:
          error.response?.data?.error || "No se pudo realizar la transferencia",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    // Estructura limpia para que fluya dentro de Layout.tsx
    <div className="max-w-md mx-auto mt-8 bg-nord-1 rounded-xl shadow-lg border border-nord-2 p-8">
      <h2 className="text-xl font-bold text-nord-8 mb-6">Enviar Dinero</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Input de Correo */}
        <div>
          <label className="block text-nord-4 text-sm font-medium mb-1">
            Correo del Destinatario
          </label>
          <input
            type="email"
            {...register("to_email")}
            className={`w-full bg-nord-0 border text-nord-6 rounded-lg p-3 focus:outline-none transition-colors ${
              errors.to_email
                ? "border-nord-11 focus:border-nord-11"
                : "border-nord-3 focus:border-nord-8"
            }`}
            placeholder="mateo@campusucc.edu.co"
          />
          {errors.to_email && (
            <p className="text-nord-11 text-xs mt-1 font-medium">
              {errors.to_email.message}
            </p>
          )}
        </div>

        {/* Input de Monto */}
        <div>
          <label className="block text-nord-4 text-sm font-medium mb-1">
            Monto a transferir (COP)
          </label>
          <input
            type="number"
            {...register("amount", { valueAsNumber: true })}
            className={`w-full bg-nord-0 border text-nord-6 rounded-lg p-3 focus:outline-none transition-colors ${
              errors.amount
                ? "border-nord-11 focus:border-nord-11"
                : "border-nord-3 focus:border-nord-8"
            }`}
            placeholder="15000"
          />
          {errors.amount && (
            <p className="text-nord-11 text-xs mt-1 font-medium">
              {errors.amount.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="w-full bg-nord-8 hover:bg-nord-10 text-nord-0 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
        >
          {isSending ? "Procesando..." : "Transferir"}
        </button>
      </form>
    </div>
  );
}
