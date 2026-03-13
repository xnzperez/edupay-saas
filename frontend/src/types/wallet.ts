// Define la estructura de cada movimiento en el historial
export interface Transaction {
  id: string;
  tx_type: string; // 'DEPOSIT', 'PURCHASE', 'FEE'
  amount: number;
  reference: string;
  created_at: string;
}

// Define la respuesta principal del dashboard
export interface WalletDashboardResponse {
  wallet_id: string;
  current_balance: number;
  updated_at: string;
  transactions: Transaction[]; // Un arreglo de transacciones
}
