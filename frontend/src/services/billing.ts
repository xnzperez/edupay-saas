import { api } from "./api";
import type {
  InstallmentsResponse,
  CreateInstallmentReq,
  StudentSearchResult,
  InstallmentResponse,
} from "../types/billing";

// ==========================================
// SERVICIOS DEL ADMINISTRADOR (CAJERO)
// ==========================================

// Función para buscar estudiantes por nombre o correo
export const searchStudents = async (
  query: string,
): Promise<StudentSearchResult[]> => {
  const response = await api.get<StudentSearchResult[]>(
    `/billing/students/search?q=${query}`,
  );
  return response.data;
};

// Función para emitir una nueva deuda/cobro a un estudiante
export const createInstallment = async (
  data: CreateInstallmentReq,
): Promise<InstallmentResponse> => {
  const response = await api.post<InstallmentResponse>(
    "/billing/installments",
    data,
  );
  return response.data;
};

// ==========================================
// SERVICIOS DEL ESTUDIANTE
// ==========================================

// Función para obtener las cuotas del estudiante logueado
export const getMyInstallments = async (): Promise<InstallmentsResponse> => {
  const response = await api.get<InstallmentsResponse>(
    "/billing/my-installments",
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
