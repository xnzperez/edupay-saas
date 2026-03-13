import { api } from "./api";
import type { InstallmentsResponse } from "../types/billing";

// Función para obtener las cuotas del estudiante logueado
export const getMyInstallments = async (): Promise<InstallmentsResponse> => {
  const response = await api.get<InstallmentsResponse>(
    "/billing/installments/me",
  );
  return response.data;
};

// Función que envia el ID de la cuota a la ruta protegida de Go
export const payInstallment = async (
  installmentId: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    `/billing/installments/${installmentId}/pay`,
  );
  return response.data;
};
