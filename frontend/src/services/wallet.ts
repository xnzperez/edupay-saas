import { api } from "./api";

// ==========================================
// NUEVAS INTERFACES PAGINADAS (Desde Go)
// ==========================================
export interface TransactionDTO {
  id: string;
  tx_type: string;
  amount: number;
  reference: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface WalletDashboardResponse {
  wallet_id: string;
  current_balance: number;
  updated_at: string;
  transactions: PaginatedResponse<TransactionDTO>;
}

// ==========================================
// TUS INTERFACES INTACTAS
// ==========================================
export interface TransferRequest {
  to_email: string;
  amount: number;
}

export interface TransferResponse {
  message: string;
  amount: number;
  to: string;
}

export interface DepositRequest {
  amount: number;
}

// ==========================================
// SERVICIOS HTTP
// ==========================================

// ACTUALIZADO: Ahora recibe la página y el límite para enviarlos a Go
export const getWalletDashboard = async (
  page: number = 1,
  limit: number = 10,
): Promise<WalletDashboardResponse> => {
  const response = await api.get<WalletDashboardResponse>(
    `/wallets/me?page=${page}&limit=${limit}`,
  );
  return response.data;
};

export const sendTransfer = async (
  data: TransferRequest,
): Promise<TransferResponse> => {
  const response = await api.post<TransferResponse>("/wallets/transfer", data);
  return response.data;
};

export const depositFunds = async (userId: string, data: DepositRequest) => {
  const response = await api.post(`/wallets/${userId}/deposit`, data);
  return response.data;
};

// ==========================================
// SERVICIOS DE AUDITORÍA (ADMIN)
// ==========================================

export interface GlobalTransactionDTO {
  id: string;
  tx_type: string;
  amount: number;
  reference: string;
  created_at: string;
  user_email: string;
  user_full_name: string;
}

/**
 * Obtiene el historial global de transacciones del tenant.
 * Exclusivo para usuarios con rol ADMIN.
 */
export const getGlobalTransactions = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedResponse<GlobalTransactionDTO>> => {
  const response = await api.get<PaginatedResponse<GlobalTransactionDTO>>(
    `/admin/transactions?page=${page}&limit=${limit}`,
  );
  return response.data;
};
