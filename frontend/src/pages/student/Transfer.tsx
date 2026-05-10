import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { sendTransfer } from "../../services/wallet";
import {
  transferSchema,
  type TransferFormValues,
} from "../../validations/transfer";

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
    } finally {
      setIsSending(false);
    }
  };

  return (
    // Estructura limpia para que fluya dentro de Layout.tsx
    <div className="max-w-md mx-auto mt-8 bg-surface rounded-xl shadow-lg border border-line p-8">
      <h2 className="text-xl font-bold text-primary mb-6">Enviar Dinero</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Input de Correo */}
        <div>
          <label className="block text-foreground text-sm font-medium mb-1">
            Correo del Destinatario
          </label>
          <input
            type="email"
            {...register("to_email")}
            className={`w-full bg-background border text-foreground rounded-lg p-3 focus:outline-none transition-colors ${
              errors.to_email
                ? "border-danger focus:border-danger"
                : "border-line focus:border-primary"
            }`}
            placeholder="mateo@campusucc.edu.co"
          />
          {errors.to_email && (
            <p className="text-danger text-xs mt-1 font-medium">
              {errors.to_email.message}
            </p>
          )}
        </div>

        {/* Input de Monto */}
        <div>
          <label className="block text-foreground text-sm font-medium mb-1">
            Monto a transferir (COP)
          </label>
          <input
            type="number"
            {...register("amount", { valueAsNumber: true })}
            className={`w-full bg-background border text-foreground rounded-lg p-3 focus:outline-none transition-colors ${
              errors.amount
                ? "border-danger focus:border-danger"
                : "border-line focus:border-primary"
            }`}
            placeholder="15000"
          />
          {errors.amount && (
            <p className="text-danger text-xs mt-1 font-medium">
              {errors.amount.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="w-full bg-primary hover:bg-primary-hover text-background font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
        >
          {isSending ? "Procesando..." : "Transferir"}
        </button>
      </form>
    </div>
  );
}
