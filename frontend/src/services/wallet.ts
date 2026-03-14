import { api } from "./api";
import type { WalletDashboardResponse } from "../types/wallet";

export const getWalletDashboard =
  async (): Promise<WalletDashboardResponse> => {
    // Solo necesitamos la ruta; Axios pone el Token y el Tenant ID por nosotros
    const response = await api.get<WalletDashboardResponse>("/wallets/me");
    return response.data;
  };

export const sendTransfer = async (
  data: TransferRequest,
): Promise<TransferResponse> => {
  const response = await api.post<TransferResponse>("/wallets/transfer", data);
  return response.data;
};
