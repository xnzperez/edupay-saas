import { api } from "./api";
import type {
  InstallmentsResponse,
  CreateInstallmentReq,
  StudentSearchResult,
  InstallmentResponse,
  AdminInstallmentDTO,
} from "../types/billing";

// ==========================================
// SERVICIOS DEL ADMINISTRADOR (CAJERO)
// ==========================================

// Función para buscar estudiantes por nombre o correo
export const searchStudents = async (
  query: string,
): Promise<StudentSearchResult[]> => {
  const response = await api.get<StudentSearchResult[]>(
    `/billing/students?q=${query}`,
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

// Función para obtener TODAS las deudas de la universidad (Cajeros)
export const getAllInstallments = async (): Promise<AdminInstallmentDTO[]> => {
  const response = await api.get<AdminInstallmentDTO[]>(
    "/billing/installments",
  );
  return response.data;
};

// Función para obtener los KPIs en tiempo real
export const getBillingStats = async (): Promise<BillingStatsDTO> => {
  const response = await api.get<BillingStatsDTO>("/billing/stats");
  return response.data;
};

// ==========================================
// SERVICIOS DEL ESTUDIANTE
// ==========================================

// Función para obtener las cuotas del estudiante logueado
export const getMyInstallments = async (): Promise<InstallmentsResponse> => {
  const response = await api.get<InstallmentsResponse>(
    "/users/me/installments",
  );
  return response.data;
};

// Función que envia el ID de la cuota a la ruta protegida de Go
export const payInstallment = async (
  installmentId: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    `/billing/installments/${installmentId}/payments`,
  );
  return response.data;
};

export const billingService = {
  /**
   * Descarga el PDF del comprobante de una cuota específica.
   */
  downloadReceipt: async (installmentId: string) => {
    // 1. Hacemos la petición pidiendo un formato binario (blob)
    const response = await api.get(
      `/billing/installments/${installmentId}/receipt`,
      {
        responseType: "blob",
      },
    );

    // 2. Creamos una URL temporal en la memoria del navegador
    const fileURL = window.URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" }),
    );

    // 3. Forzamos la descarga creando un enlace invisible y haciéndole clic
    const fileLink = document.createElement("a");
    fileLink.href = fileURL;
    fileLink.setAttribute(
      "download",
      `recibo_${installmentId.substring(0, 8)}.pdf`,
    );

    document.body.appendChild(fileLink);
    fileLink.click();

    // 4. Limpiamos la memoria
    fileLink.remove();
    window.URL.revokeObjectURL(fileURL);
  },
};
