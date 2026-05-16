import { api } from "./api";
import type { CreateTenantFormData } from "../validations/tenant";

export interface CreateTenantResponse {
  message: string;
  tenant_id: string;
  admin_id: string;
  domain: string;
}

export const tenantService = {
  createTenant: async (
    data: CreateTenantFormData,
  ): Promise<CreateTenantResponse> => {
    // Usamos 'api' para inyectar automáticamente el Bearer Token y el X-Tenant-ID Maestro
    const response = await api.post<CreateTenantResponse>(
      "/admin/tenants",
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
  const response = await api.get("/tenants");
  return response.data.data;
};

export const updateTenantStatus = async (
  id: string,
  isActive: boolean,
): Promise<void> => {
  await api.patch(`/tenants/${id}/status`, { is_active: isActive });
};

export interface MyTenant {
  id: string;
  name: string;
  domain: string;
  default_interest_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface UpdateMyTenantData {
  domain: string;
  default_interest_rate: number;
}

export const getMyTenantInfo = async (): Promise<MyTenant> => {
  const response = await api.get("/superadmin/my-tenant");
  return response.data.data;
};

export const updateMyTenant = async (
  data: UpdateMyTenantData,
): Promise<void> => {
  await api.patch("/superadmin/my-tenant", data);
};
