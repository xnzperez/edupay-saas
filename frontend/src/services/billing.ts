import { api } from "./api";
import type { InstallmentsResponse } from "../types/billing";

// ==========================================
// SERVICIOS DEL ADMINISTRADOR (CAJERO)
// ==========================================

export interface CreateInstallmentRequest {
  user_id: string;
  concept: string;
  amount: number;
  due_date: string;
}

// Función para emitir una nueva deuda/cobro a un estudiante
export const createInstallment = async (data: CreateInstallmentRequest) => {
  const response = await api.post("/billing/installments", data);
  return response.data;
};

// ==========================================
// SERVICIOS DEL ESTUDIANTE
// ==========================================

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
