import { api } from "./api";
import type { LoginRequest, LoginResponse } from "../types/auth";

// Tipados para los nuevos endpoints (puedes moverlos a src/types/auth.ts luego si lo prefieres)
export interface RequestOTPPayload {
  email: string;
}

export interface ConfirmResetPayload {
  email: string;
  otp_code: string;
  new_password: string;
}

export const loginUser = async (
  credentials: LoginRequest,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/users/login", credentials);
  return response.data;
};

// --- NUEVAS FUNCIONES DE RECUPERACIÓN ---

export const requestPasswordReset = async (
  payload: RequestOTPPayload,
  tenantId: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    "/users/password-reset/request",
    payload,
    {
      headers: {
        "X-Tenant-ID": tenantId,
      },
    },
  );
  return response.data;
};

export const confirmPasswordReset = async (
  payload: ConfirmResetPayload,
  tenantId: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    "/users/password-reset/confirm",
    payload,
    {
      headers: {
        "X-Tenant-ID": tenantId,
      },
    },
  );
  return response.data;
};
