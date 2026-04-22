import axios from "axios";
import type { CreateTenantFormData } from "../validations/tenant";

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
