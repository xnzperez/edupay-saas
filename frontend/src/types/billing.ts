// Representa una cuota o deuda individual
export interface Installment {
  id: string;
  description: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE"; // Tipado estricto para los estados
  due_date: string;
  created_at: string;
}

// Representa la respuesta completa del servidor
export interface InstallmentsResponse {
  installments: Installment[];
}
