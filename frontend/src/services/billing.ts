import { api } from "./api";
import type { InstallmentsResponse } from "../types/billing";

// Función para obtener las cuotas del estudiante logueado
export const getMyInstallments = async (): Promise<InstallmentsResponse> => {
  const response = await api.get<InstallmentsResponse>(
    "/billing/installments/me",
  );
  return response.data;
};
