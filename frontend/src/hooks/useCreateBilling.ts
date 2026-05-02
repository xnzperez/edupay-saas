import { useState } from "react";
import axios from "axios";
import { sileo } from "sileo";
import { createInstallment } from "../services/billing";
import type { CreateInstallmentReq } from "../types/billing";

interface UseCreateBillingProps {
  onSuccess?: () => void;
}

export function useCreateBilling({ onSuccess }: UseCreateBillingProps = {}) {
  const [isBilling, setIsBilling] = useState(false);

  const emitInstallment = async (data: CreateInstallmentReq, studentName: string) => {
    setIsBilling(true);

    try {
      await createInstallment(data);

      sileo.success({
        title: "Cobro Generado",
        description: `Se ha emitido el recibo de $${data.amount.toLocaleString("es-CO")} a ${studentName}.`,
      });

      if (onSuccess) {
        onSuccess();
      }
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Los errores HTTP (400, 500) ya los maneja el interceptor en api.ts
        // Aquí solo notificamos internamente si es necesario
        console.error("Error emitiendo el cobro:", error.message);
      } else {
        console.error("Error inesperado:", error);
      }
      return false;
    } finally {
      setIsBilling(false);
    }
  };

  return {
    isBilling,
    emitInstallment,
  };
}
