import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { useAuthStore } from "../../store/authStore";

// Importamos los servicios reales
import { getWalletDashboard } from "../../services/wallet";
import { getMyInstallments, payInstallment } from "../../services/billing";
import { createPaymentPreference } from "../../services/payment";

// Definimos las estructuras visuales basadas en lo que devuelve Go
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
  // Estados para la recarga de saldo
  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const user = useAuthStore((state) => state.user);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [debts, setDebts] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Función para cargar todos los datos frescos desde Go
  const fetchDashboardData = async () => {
    try {
      // Promise.all permite hacer ambas peticiones al mismo tiempo (más rápido)
      const [walletRes, debtsRes] = await Promise.all([
        getWalletDashboard(),
        getMyInstallments(),
      ]);

      setWallet(walletRes);

      // Filtramos para mostrar solo las que están pendientes (por si Go devuelve todo el historial)
      const pendingDebts = (
        Array.isArray(debtsRes)
          ? debtsRes
          : (debtsRes as any).installments || []
      ).filter((d: Installment) => d.status !== "PAID");
      setDebts(pendingDebts);
    } catch (error) {
      console.error("Error cargando el dashboard", error);
      sileo.error({
        title: "Error de conexión",
        description: "No pudimos cargar tu información financiera.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se ejecuta automáticamente al entrar a la página
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Lógica para pagar la deuda
  const handlePayDebt = async (installmentId: string, amount: number) => {
    if (!wallet || wallet.current_balance < amount) {
      sileo.error({
        title: "Saldo Insuficiente",
        description:
          "No tienes suficientes fondos en tu billetera para pagar esta cuota.",
      });
      return;
    }

    setPayingId(installmentId);
    try {
      await payInstallment(installmentId);

      sileo.success({
        title: "¡Pago Exitoso!",
        description: "La cuota ha sido pagada y descontada de tu saldo.",
      });

      // Recargamos los datos para que desaparezca la deuda y baje el saldo
      await fetchDashboardData();
    } catch (error: any) {
      sileo.error({
        title: "Error al procesar el pago",
        description:
          error.response?.data?.error || "Intenta nuevamente más tarde.",
      });
    } finally {
      setPayingId(null);
    }
  };

  // NUEVO: Lógica para recargar saldo vía Mercado Pago
  const handleTopUp = async () => {
    if (!topUpAmount || topUpAmount < 1000) {
      sileo.error({
        title: "Monto inválido",
        description: "El monto mínimo de recarga es de $1,000 COP",
      });
      return;
    }

    setIsRedirecting(true);
    try {
      const response = await createPaymentPreference(Number(topUpAmount));

      // Magia: Redirigimos al usuario a la página de Mercado Pago
      window.location.href = response.checkout_url;
    } catch (error: any) {
      sileo.error({
        title: "Error al iniciar pago",
        description: error.response?.data?.error || "Intenta nuevamente.",
      });
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center animate-pulse text-nord-4">
        Cargando tu bóveda financiera...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Saludo */}
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Hola, {user?.role === "STUDENT" ? "Estudiante" : "Usuario"} 👋
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Este es el resumen de tu billetera institucional.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- COLUMNA PRINCIPAL (Billetera y Movimientos) --- */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tarjeta de la Billetera */}
          <div className="bg-gradient-to-br from-nord-3 to-nord-1 p-8 rounded-3xl border border-nord-2 shadow-xl relative overflow-hidden">
            {/* Adorno de fondo */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-nord-8/10 rounded-full blur-2xl"></div>

            <p className="text-sm font-bold text-nord-4 uppercase tracking-wider mb-2 relative z-10">
              Saldo Disponible (COP)
            </p>
            <h2 className="text-5xl font-black text-nord-8 tracking-tight relative z-10">
              ${wallet?.current_balance.toLocaleString() || "0"}
            </h2>

            <div className="mt-6 flex gap-4 relative z-10">
              <button className="bg-nord-8 hover:bg-nord-9 text-nord-0 font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-nord-8/20">
                Transferir a compañero
              </button>
            </div>

            {/* NUEVA SECCIÓN DE RECARGA */}
            <div className="mt-8 pt-6 border-t border-nord-2/50 relative z-10">
              <p className="text-sm font-bold text-nord-4 mb-3">
                Recarga tu cuenta vía PSE o Tarjeta
              </p>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nord-4 font-bold">
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
                    placeholder="Ej. 50000"
                    className="w-full pl-8 pr-4 py-3 bg-nord-0 border border-nord-3 rounded-xl text-nord-6 focus:ring-2 focus:ring-nord-8 focus:outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleTopUp}
                  disabled={isRedirecting || !topUpAmount}
                  className="bg-nord-8 hover:bg-nord-9 text-nord-0 font-extrabold py-3 px-6 rounded-xl transition-all shadow-lg shadow-nord-8/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isRedirecting ? "Conectando..." : "Recargar Saldo"}
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Transacciones */}
          <div className="bg-nord-1 border border-nord-2 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-nord-2">
              <h3 className="text-lg font-bold text-nord-6">
                Últimos Movimientos
              </h3>
            </div>

            {wallet?.transactions.length === 0 ? (
              <div className="p-8 text-center text-nord-4 font-medium">
                No tienes movimientos recientes.
              </div>
            ) : (
              <div className="divide-y divide-nord-2">
                {wallet?.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between hover:bg-nord-2/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          tx.tx_type === "DEPOSIT"
                            ? "bg-nord-14/20 text-nord-14"
                            : "bg-nord-11/20 text-nord-11"
                        }`}
                      >
                        {tx.tx_type === "DEPOSIT" ? "↓" : "↑"}
                      </div>
                      <div>
                        <p className="font-bold text-nord-6">
                          {tx.reference || "Transacción"}
                        </p>
                        <p className="text-xs text-nord-4">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-black text-lg ${
                          tx.tx_type === "DEPOSIT"
                            ? "text-nord-14"
                            : "text-nord-11"
                        }`}
                      >
                        {tx.tx_type === "DEPOSIT" ? "+" : "-"}$
                        {tx.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- COLUMNA LATERAL (Deudas / Cobros) --- */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-nord-6 flex items-center gap-2">
            Deudas Pendientes
            {debts.length > 0 && (
              <span className="bg-nord-11 text-nord-0 text-xs px-2 py-1 rounded-full">
                {debts.length}
              </span>
            )}
          </h3>

          {debts.length === 0 ? (
            <div className="bg-nord-1 border border-dashed border-nord-3 p-8 rounded-2xl text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-nord-4 font-medium">
                ¡Estás al día con la universidad!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className="bg-nord-1 border border-nord-11/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-nord-11 transition-colors"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-nord-11"></div>

                  <p className="text-xs font-bold text-nord-4 uppercase mb-1">
                    Vence: {new Date(debt.due_date).toLocaleDateString()}
                  </p>
                  <h4 className="font-bold text-nord-6 text-lg">
                    {debt.description}
                  </h4>
                  <p className="text-2xl font-black text-nord-11 my-3">
                    ${debt.amount.toLocaleString()}
                  </p>

                  <button
                    onClick={() => handlePayDebt(debt.id, debt.amount)}
                    disabled={payingId === debt.id}
                    className="w-full bg-nord-11 hover:bg-red-600 text-nord-0 font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {payingId === debt.id ? "Procesando..." : "Pagar Cuota"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
