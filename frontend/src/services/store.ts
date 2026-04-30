import { api } from "./api";

export interface PurchaseRequest {
  item_id: string;
}

export interface PurchaseResponse {
  message: string;
  status: string;
}

export const storeService = {
  /**
   * Envía la orden de compra al backend.
   * La respuesta será inmediata (HTTP 200), mientras que Go
   * procesa el PDF y envía el correo en segundo plano.
   */
  buyCertificate: async (itemId: string): Promise<PurchaseResponse> => {
    const payload: PurchaseRequest = { item_id: itemId };
    const response = await api.post<PurchaseResponse>("/store/buy", payload);
    return response.data;
  },
};
