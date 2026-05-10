import { useEffect, useState, useMemo } from "react";
import { sileo } from "sileo";
import { useAuthStore } from "../../store/authStore";
import { getWalletDashboard } from "../../services/wallet";
import type { WalletDashboardResponse } from "../../services/wallet";
import {
  getMyInstallments,
  payInstallment,
} from "../../services/billing";
import { createPaymentPreference } from "../../services/payment";

interface Installment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "PENDING" | "PAID";
}

type TxFilter = "ALL" | "IN" | "OUT";

export default function Dashboard() {
  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const user = useAuthStore((state) => state.user);

  const [page, setPage] = useState<number>(1);
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL"); // Estado del filtro

  const [wallet, setWallet] = useState<WalletDashboardResponse | null>(null);
  const [debts, setDebts] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchDashboardData = async (currentPage: number) => {
    try {
      const [walletRes, debtsRes] = await Promise.all([
        getWalletDashboard(currentPage, 10), // Aumenté el límite a 10 para que los filtros tengan sentido
        getMyInstallments(),
      ]);
      setWallet(walletRes);
      const pendingDebts = (
        Array.isArray(debtsRes)
          ? debtsRes
          : (debtsRes as any).installments || []
      ).filter((d: Installment) => d.status !== "PAID");
      setDebts(pendingDebts);
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(page);
  }, [page]);

  // Lógica de filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    if (!wallet) return [];
    return wallet.transactions.data.filter((tx) => {
      const isIncome = tx.tx_type === "DEPOSIT" || tx.tx_type === "TRANSFER_IN";
      if (txFilter === "IN") return isIncome;
      if (txFilter === "OUT") return !isIncome;
      return true; // ALL
    });
  }, [wallet, txFilter]);


  const handlePayDebt = async (installmentId: string, amount: number) => {
    if (!wallet || wallet.current_balance < amount) {
      sileo.error({
        title: "Saldo Insuficiente",
        description: "Recarga tu billetera para cubrir la cuota.",
      });
      return;
    }
    setPayingId(installmentId);
    try {
      await payInstallment(installmentId);
      sileo.success({
        title: "¡Transacción Exitosa!",
        description: "Cuota saldada.",
      });
      await fetchDashboardData(page);
    } catch (error: any) {
    } finally {
      setPayingId(null);
    }
  };

  const handleTopUp = async () => {
    if (!topUpAmount || topUpAmount < 1000) {
      sileo.error({
        title: "Monto No Válido",
        description: "El mínimo de recarga es $1,000 COP.",
      });
      return;
    }
    setIsRedirecting(true);
    try {
      const response = await createPaymentPreference(Number(topUpAmount));
      window.location.href = response.checkout_url;
    } catch (error: any) {
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-line rounded-lg"></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-56 bg-surface border border-line rounded-3xl"></div>
            <div className="h-56 bg-surface border border-line rounded-3xl"></div>
            <div className="md:col-span-2 h-96 bg-surface border border-line rounded-3xl"></div>
          </div>
          <div className="h-[600px] bg-surface border border-line rounded-3xl"></div>
        </div>
      </div>
    );
  }

  interface CustomJwtPayload {
    email?: string;
  }
  const currentUser = user as CustomJwtPayload | null;
  const studentName =
    currentUser?.email?.split("@")[0].replace(".", " ").toUpperCase() || "ESTUDIANTE";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">
            Mi <span className="text-primary">Billetera</span>
          </h1>
          <p className="text-muted mt-1 font-medium text-sm">
            Panel de control financiero estudiantil
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta Virtual (Intacta) */}
            <div className="relative bg-gradient-to-br from-primary to-primary-hover p-6 rounded-3xl shadow-xl shadow-primary/20 overflow-hidden flex flex-col justify-between min-h-[220px] group transition-transform hover:-translate-y-1">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1">
                    Universidad Cooperativa
                  </p>
                  <p className="text-white font-semibold text-sm tracking-wide">
                    EduPay Card
                  </p>
                </div>
                <svg
                  className="w-10 h-10 text-white/80"
                  fill="none"
                  viewBox="0 0 36 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 0h24c3.314 0 6 2.686 6 6v12c0 3.314-2.686 6-6 6H6c-3.314 0-6-2.686-6-6V6c0-3.314 2.686-6 6-6z"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M11 5h14v14H11z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 12h14M18 5v14M11 8.5h4M25 8.5h-4M11 15.5h4M25 15.5h-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="relative z-10 mt-6">
                <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">
                  Saldo Disponible
                </p>
                <h2 className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                  ${wallet?.current_balance.toLocaleString()}
                </h2>
              </div>
              <div className="relative z-10 mt-4 flex justify-between items-end">
                <p className="text-white/90 font-mono text-sm tracking-widest">
                  {studentName}
                </p>
                <p className="text-white/60 font-mono text-xs">VIRTUAL</p>
              </div>
            </div>

            {/* Recarga Rápida (Intacta) */}
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Añadir Fondos
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Recarga tu billetera de forma instantánea usando Mercado Pago.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">
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
                    placeholder="Monto"
                    className="w-full pl-8 pr-4 py-3 bg-background border border-line rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all font-bold text-sm"
                  />
                </div>
                <button
                  onClick={handleTopUp}
                  disabled={isRedirecting || !topUpAmount}
                  className="w-full bg-foreground hover:bg-primary text-background font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
                >
                  {isRedirecting ? (
                    <span className="animate-pulse">PROCESANDO...</span>
                  ) : (
                    "IR A CHECKOUT"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bento 3: Historial con Filtros */}
          <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-sm flex-1 flex flex-col">
            <div className="p-4 border-b border-line bg-line/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-sm font-bold text-foreground px-2">
                Historial de Transacciones
              </h3>

              {/* Filtros de Pestaña */}
              <div className="flex bg-background border border-line rounded-lg p-1">
                {(["ALL", "IN", "OUT"] as TxFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTxFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      txFilter === filter
                        ? "bg-surface shadow-sm text-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {filter === "ALL"
                      ? "TODOS"
                      : filter === "IN"
                        ? "INGRESOS"
                        : "EGRESOS"}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-muted font-medium text-sm flex-1 flex items-center justify-center">
                No hay movimientos para este filtro.
              </div>
            ) : (
              <div className="divide-y divide-line flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                {filteredTransactions.map((tx) => {
                  const isPositive =
                    tx.tx_type === "DEPOSIT" || tx.tx_type === "TRANSFER_IN";
                  return (
                    <div
                      key={tx.id}
                      className="p-4 flex items-center justify-between hover:bg-line/20 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                        >
                          {isPositive ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                            {tx.reference || "Transacción"}
                          </p>
                          <p className="text-[11px] text-muted font-medium uppercase tracking-wider mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-black tabular-nums shrink-0 ${isPositive ? "text-success" : "text-foreground"}`}
                      >
                        {isPositive ? "+" : "-"}${tx.amount.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Paginación */}
            {wallet && wallet.transactions.total_pages > 1 && (
              <div className="p-3 flex items-center justify-between border-t border-line bg-surface">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs font-bold px-3 py-1.5 bg-background border border-line rounded hover:border-primary disabled:opacity-30 transition-all"
                >
                  ← ANT
                </button>
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {page} / {wallet.transactions.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= wallet.transactions.total_pages}
                  className="text-xs font-bold px-3 py-1.5 bg-background border border-line rounded hover:border-primary disabled:opacity-30 transition-all"
                >
                  SIG →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Deudas */}
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-sm font-bold text-foreground">
                Pagos Pendientes
              </h3>
              {debts.length > 0 && (
                <span className="bg-danger/10 text-danger border border-danger/20 px-2.5 py-1 rounded-full text-[10px] font-black animate-pulse">
                  {debts.length} PENDIENTES
                </span>
              )}
            </div>

            {debts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-line rounded-2xl bg-background/50">
                <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-foreground font-bold text-sm">Todo al día</p>
                <p className="text-muted text-xs mt-1">
                  No tienes obligaciones financieras.
                </p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="bg-background border border-line p-5 rounded-2xl relative overflow-hidden group hover:border-primary/50 transition-colors"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-danger"></div>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Vence: {new Date(debt.due_date).toLocaleDateString()}
                      </p>
                      <h4 className="font-bold text-foreground text-sm leading-tight">
                        {debt.description}
                      </h4>
                    </div>
                    <p className="text-2xl font-black text-foreground tabular-nums mb-4">
                      ${debt.amount.toLocaleString()}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handlePayDebt(debt.id, debt.amount)}
                        disabled={payingId === debt.id}
                        className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-40"
                      >
                        {payingId === debt.id ? "PROCESANDO..." : "PAGAR AHORA"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NUEVO BENTO: Visualizador de Impacto de Mora */}
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            {/* Decoración sutil */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg
                className="w-24 h-24 text-danger"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                  Educación Financiera
                </h3>
              </div>
              <p className="text-sm font-bold text-foreground mb-6">
                Impacto por Pago Extemporáneo (Mora)
              </p>

              <div className="space-y-5">
                {/* Barra 1: A Tiempo */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-foreground">
                      Cuota a Tiempo
                    </span>
                    <span className="text-sm font-black text-success">
                      $500,000
                    </span>
                  </div>
                  <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-success h-full rounded-full"
                      style={{ width: "80%" }}
                    ></div>
                  </div>
                </div>

                {/* Barra 2: Vencido */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-foreground">
                      Cuota Vencida{" "}
                      <span className="text-danger ml-1">+15%</span>
                    </span>
                    <span className="text-sm font-black text-danger">
                      $575,000
                    </span>
                  </div>
                  <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-danger h-full rounded-full relative"
                      style={{ width: "100%" }}
                    >
                      <div className="absolute top-0 bottom-0 right-0 w-[20%] bg-white/30 diagonal-stripes"></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted mt-2 leading-relaxed">
                    Evita reportes negativos y recargos. El sistema aplica
                    bloqueos de fila ACID inmediatos al registrar mora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
