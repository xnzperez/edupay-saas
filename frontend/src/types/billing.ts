// src/types/billing.ts

export interface StudentSearchResult {
  id: string;
  full_name: string;
  email: string;
  current_balance: number;
}

export interface CreateInstallmentReq {
  user_id: string;
  description: string; // En Go lo llamamos description
  amount: number;
  due_date: string;
}

export interface InstallmentResponse {
  message: string;
  installment_id: string;
}

export interface InstallmentDTO {
  id: string;
  description: string;
  amount: number;
  status: string; // 'PENDING', 'PAID', 'OVERDUE'
  due_date: string;
  created_at: string;
}

export interface InstallmentsResponse {
  installments: InstallmentDTO[];
}

// DTO para la tabla general del Cajero
export interface AdminInstallmentDTO {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  student_name: string;
  student_email: string;
}

// DTO para las estadísticas del Dashboard del Cajero
export interface BillingStatsDTO {
  total_collected: number;
  total_debt: number;
  overdue_count: number;
  active_students: number;
}
