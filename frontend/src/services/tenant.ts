import axios from "axios";
import type { CreateTenantFormData } from "../validations/tenant";
import { api } from "./api";

export interface CreateTenantResponse {
  message: string;
  tenant_id: string;
}

// 1. Calculamos la URL base real de Go, eliminando el "/api" final si existe en tu variable de entorno
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const ROOT_URL = API_URL.replace(/\/api$/, "");

export const tenantService = {
  createTenant: async (
    data: CreateTenantFormData,
  ): Promise<CreateTenantResponse> => {
    // 2. Usamos 'axios' puro (NO importamos 'api' de api.ts).
    // De esta forma, si falla, no se disparará el redireccionamiento fantasma al login.
    // 3. Apuntamos directo a ROOT_URL/admin/tenants
    const response = await axios.post<CreateTenantResponse>(
      `${ROOT_URL}/admin/tenants`,
      data,
    );
    return response.data;
  },
};

export interface Tenant {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export const getTenants = async (): Promise<Tenant[]> => {
  const response = await api.get("/tenants"); // Asegúrate de que la ruta coincida con tu main.go
  return response.data.data; // Retornamos el array que viene dentro de "data"
};

// NUEVA FUNCIÓN: Para suspender/activar la universidad
export const updateTenantStatus = async (
  id: string,
  isActive: boolean,
): Promise<void> => {
  await api.patch(`/tenants/${id}/status`, { is_active: isActive });
};

// Interfaz para la respuesta de "Mi Universidad"
export interface MyTenant {
  id: string;
  name: string;
  domain: string;
  default_interest_rate: number;
  is_active: boolean;
  created_at: string;
}

// Interfaz para actualizar "Mi Universidad"
export interface UpdateMyTenantData {
  domain: string;
  default_interest_rate: number;
}

// Obtener la información de la universidad del usuario logueado
export const getMyTenantInfo = async (): Promise<MyTenant> => {
  const response = await api.get("/superadmin/my-tenant");
  return response.data.data;
};

// Actualizar la configuración de la universidad local
export const updateMyTenant = async (
  data: UpdateMyTenantData,
): Promise<void> => {
  await api.patch("/superadmin/my-tenant", data);
};
