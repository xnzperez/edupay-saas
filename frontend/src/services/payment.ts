import { api } from "./api";

export const createPaymentPreference = async (
  amount: number,
): Promise<{ checkout_url: string }> => {
  const response = await api.post("/payments/preference", { amount });
  return response.data;
};
