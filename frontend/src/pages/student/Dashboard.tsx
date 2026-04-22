import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { useAuthStore } from "../../store/authStore";

// Importamos los servicios de wallet y billing
import { getWalletDashboard } from "../../services/wallet";
import {
  getMyInstallments,
  payInstallment,
  billingService,
} from "../../services/billing";
import { createPaymentPreference } from "../../services/payment";

// --- INTERFACES ---
interface Transaction {
  id: string;
  tx_type: string;
  amount: number;
  reference: string;
  created_at: string;
}

interface WalletData {
  wallet_id: string;
  current_balance: number;
  updated_at: string;
  transactions: Transaction[];
}

interface Installment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "PENDING" | "PAID";
}

export default function Dashboard() {
  // Estados de recarga y usuario
  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Estados de datos financieros
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [debts, setDebts] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de carga para acciones (UX)
  const [payingId, setPayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Carga inicial de datos desde el backend (Go)
  const fetchDashboardData = async () => {
    try {
      const [walletRes, debtsRes] = await Promise.all([
        getWalletDashboard(),
        getMyInstallments(),
      ]);

      setWallet(walletRes);

      // Normalización de la respuesta de cuotas
      const pendingDebts = (
        Array.isArray(debtsRes)
          ? debtsRes
          : (debtsRes as any).installments || []
      ).filter((d: Installment) => d.status !== "PAID");

      setDebts(pendingDebts);
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
      sileo.error({
        title: "Error de sincronización",
        description: "No se pudo recuperar tu estado financiero actual.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handler: Descarga de Comprobante PDF (Módulo 4)
  const handleDownloadReceipt = async (installmentId: string) => {
    setDownloadingId(installmentId);
    try {
      await billingService.downloadReceipt(installmentId);
      sileo.success({
        title: "Documento Generado",
        description: "Tu estado de cuenta se ha descargado exitosamente.",
      });
    } catch (error) {
      sileo.error({
        title: "Error de Reportes",
        description:
          "El servidor de archivos no respondió. Intenta en unos minutos.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Handler: Pago de Cuota (Lógica transaccional)
  const handlePayDebt = async (installmentId: string, amount: number) => {
    if (!wallet || wallet.current_balance < amount) {
      sileo.error({
        title: "Saldo Insuficiente",
        description: "Recarga tu billetera para cubrir el monto de esta cuota.",
      });
      return;
    }

    setPayingId(installmentId);
    try {
      await payInstallment(installmentId);
      sileo.success({
        title: "¡Transacción Exitosa!",
        description: "La cuota ha sido saldada y el registro actualizado.",
      });
      await fetchDashboardData();
    } catch (error: any) {
      sileo.error({
        title: "Error en el Pago",
        description:
          error.response?.data?.error ||
          "La transacción fue rechazada por el banco.",
      });
    } finally {
      setPayingId(null);
    }
  };

  // Handler: Recarga externa (Mercado Pago)
  const handleTopUp = async () => {
    if (!topUpAmount || topUpAmount < 1000) {
      sileo.error({
        title: "Monto No Válido",
        description: "El monto mínimo de recarga es de $1,000 COP.",
      });
      return;
    }

    setIsRedirecting(true);
    try {
      const response = await createPaymentPreference(Number(topUpAmount));
      window.location.href = response.checkout_url;
    } catch (error: any) {
      sileo.error({
        title: "Error de Pasarela",
        description:
          error.response?.data?.error ||
          "No se pudo iniciar la conexión con PSE.",
      });
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center animate-pulse text-nord-4 font-mono">
        ESTABLECIENDO CONEXIÓN SEGURA...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-black text-nord-6 tracking-tighter">
          Dashboard <span className="text-nord-8">Financiero</span>
        </h1>
        <p className="text-nord-4 mt-1 font-medium">
          Sesión activa: {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- COLUMNA IZQUIERDA (Wallet + Movimientos) --- */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Billetera Principal */}
          <div className="bg-nord-1 p-8 rounded-3xl border border-nord-2 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-nord-8/5 rounded-full blur-3xl"></div>

            <p className="text-xs font-bold text-nord-4 uppercase tracking-widest mb-2">
              Saldo Neto Disponible
            </p>
            <h2 className="text-5xl font-black text-nord-8 tabular-nums">
              ${wallet?.current_balance.toLocaleString()}
            </h2>

            {/* Formulario de Recarga */}
            <div className="mt-10 pt-6 border-t border-nord-2/40">
              <p className="text-sm font-bold text-nord-4 mb-4">
                Recarga rápida vía Mercado Pago
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-nord-4 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) =>
                      setTopUpAmount(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Monto a recargar"
                    className="w-full pl-9 pr-4 py-3 bg-nord-0 border border-nord-3 rounded-xl text-nord-6 focus:ring-2 focus:ring-nord-8 focus:outline-none transition-all font-bold"
                  />
                </div>
                <button
                  onClick={handleTopUp}
                  disabled={isRedirecting || !topUpAmount}
                  className="bg-nord-8 hover:bg-nord-9 text-nord-0 font-extrabold py-3 px-8 rounded-xl transition-all shadow-lg shadow-nord-8/10 disabled:opacity-30"
                >
                  {isRedirecting ? "REDIRIGIENDO..." : "RECARGAR"}
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos */}
          <div className="bg-nord-1 border border-nord-2 rounded-3xl overflow-hidden">
            <div className="p-6 bg-nord-2/30">
              <h3 className="text-sm font-black text-nord-6 uppercase tracking-wider">
                Actividad Reciente
              </h3>
            </div>
            {wallet?.transactions.length === 0 ? (
              <div className="p-12 text-center text-nord-4 italic">
                No hay registros en el historial.
              </div>
            ) : (
              <div className="divide-y divide-nord-2">
                {wallet?.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-5 flex items-center justify-between hover:bg-nord-2/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-10 rounded-full ${tx.tx_type === "DEPOSIT" ? "bg-nord-14" : "bg-nord-11"}`}
                      ></div>
                      <div>
                        <p className="font-bold text-nord-6 text-sm">
                          {tx.reference || "Transacción"}
                        </p>
                        <p className="text-xs text-nord-4 font-mono">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-black text-lg ${tx.tx_type === "DEPOSIT" ? "text-nord-14" : "text-nord-11"}`}
                    >
                      {tx.tx_type === "DEPOSIT" ? "+" : "-"}$
                      {tx.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- COLUMNA DERECHA (Deudas) --- */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-nord-6 uppercase tracking-wider flex items-center gap-2">
            Compromisos Pendientes
            {debts.length > 0 && (
              <span className="bg-nord-11 text-nord-0 px-2 py-0.5 rounded text-[10px]">
                {debts.length}
              </span>
            )}
          </h3>

          {debts.length === 0 ? (
            <div className="bg-nord-1 border border-dashed border-nord-3 p-10 rounded-3xl text-center">
              <p className="text-nord-4 font-bold text-sm">
                SIN DEUDAS ACTIVAS
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className="bg-nord-1 border border-nord-2 p-6 rounded-3xl shadow-lg hover:border-nord-8 transition-all group"
                >
                  <p className="text-[10px] font-black text-nord-4 uppercase mb-2">
                    Vencimiento: {new Date(debt.due_date).toLocaleDateString()}
                  </p>
                  <h4 className="font-bold text-nord-6 leading-tight mb-4">
                    {debt.description}
                  </h4>
                  <p className="text-3xl font-black text-nord-8 mb-6">
                    ${debt.amount.toLocaleString()}
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handlePayDebt(debt.id, debt.amount)}
                      disabled={payingId === debt.id}
                      className="w-full bg-nord-8 hover:bg-nord-9 text-nord-0 font-extrabold py-3 rounded-xl transition-all disabled:opacity-40"
                    >
                      {payingId === debt.id ? "PROCESANDO..." : "PAGAR AHORA"}
                    </button>

                    <button
                      onClick={() => handleDownloadReceipt(debt.id)}
                      disabled={downloadingId === debt.id}
                      className="w-full bg-nord-2 hover:bg-nord-3 text-nord-6 font-bold py-2.5 rounded-xl transition-all disabled:opacity-40 text-xs flex items-center justify-center gap-2"
                    >
                      {downloadingId === debt.id
                        ? "GENERANDO PDF..."
                        : "📄 DESCARGAR COMPROBANTE"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
