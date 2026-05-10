import { api } from "./api";

export interface LocalAdmin {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export interface CreateAdminData {
  full_name: string;
  email: string;
  password: string;
}

// 1. Obtener todos los cajeros
export const getLocalAdmins = async (): Promise<LocalAdmin[]> => {
  const response = await api.get("/superadmin/admins");
  return response.data.data;
};

// 2. Crear un nuevo cajero
export const createLocalAdmin = async (
  data: CreateAdminData,
): Promise<void> => {
  await api.post("/superadmin/admins", data);
};

// 3. Suspender o Reactivar un cajero
export const updateLocalAdminStatus = async (
  id: string,
  isActive: boolean,
): Promise<void> => {
  await api.patch(`/superadmin/admins/${id}/status`, { is_active: isActive });
};
