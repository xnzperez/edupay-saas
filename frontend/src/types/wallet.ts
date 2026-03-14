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

// Datos que enviaremos a Go (exactamente como lo pide nuestro TransferRequest en el backend)
export interface TransferRequest {
  to_email: string;
  amount: number;
}

// Lo que Go nos responde cuando la transferencia es exitosa
export interface TransferResponse {
  message: string;
  amount: number;
  to: string;
}
