import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { sileo } from "sileo";
import { getWalletDashboard } from "../services/wallet";
import { getMyInstallments, payInstallment } from "../services/billing"; // Importamos la nueva función
import type { WalletDashboardResponse } from "../types/wallet";
import type { Installment } from "../types/billing";

export default function Dashboard() {
  const [dashboardData, setDashboardData] =
    useState<WalletDashboardResponse | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false); // Estado para evitar doble clic al pagar

  // Usamos useCallback para poder llamar esta función desde el useEffect y desde el botón de pago
  const fetchAllData = useCallback(async () => {
    try {
      const [walletData, billingData] = await Promise.all([
        getWalletDashboard(),
        getMyInstallments(),
      ]);

      setDashboardData(walletData);
      setInstallments(billingData.installments || []);
    } catch (error: any) {
      sileo.error({
        title: "Error de carga",
        description: error.response?.data?.error || "Error al cargar los datos",
      });
      if (error.response?.status === 401) {
        localStorage.removeItem("jwt_token");
        window.location.href = "/login";
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // FUNCIÓN DE PAGO
  const handlePay = async (installmentId: string) => {
    if (isPaying) return; // Previene que el usuario haga múltiples clics
    setIsPaying(true);

    try {
      // 1. Enviamos la orden de pago a Go
      const data = await payInstallment(installmentId);
      sileo.success({
        title: "¡Pago exitoso!",
        description: data.message || "Cuota pagada exitosamente",
      });

      // 2. Si fue exitoso, recargamos los datos para actualizar el saldo y cambiar el estado a PAGADO
      await fetchAllData();
    } catch (error: any) {
      // Si no hay saldo suficiente, Go nos enviará el error y Sileo lo mostrará en rojo
      sileo.error({
        title: "Pago rechazado",
        description: error.response?.data?.error || "No se pudo procesar el pago",
      });
    } finally {
      setIsPaying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-3 py-1 bg-nord-13 text-nord-0 text-xs font-bold rounded-full">
            PENDIENTE
          </span>
        );
      case "PAID":
        return (
          <span className="px-3 py-1 bg-nord-14 text-nord-0 text-xs font-bold rounded-full">
            PAGADO
          </span>
        );
      case "OVERDUE":
        return (
          <span className="px-3 py-1 bg-nord-11 text-nord-6 text-xs font-bold rounded-full">
            VENCIDO
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-nord-4 py-10">
        Cargando tu información financiera...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de Saldo */}
              <div className="bg-nord-1 p-8 rounded-xl shadow-lg border border-nord-2 text-center relative">
                <p className="text-nord-4 text-lg mb-2">Saldo Disponible</p>
                <h2 className="text-5xl font-bold text-nord-14 mb-6">
                  {dashboardData
                    ? formatCurrency(dashboardData.current_balance)
                    : "$0"}
                </h2>

                {/* BOTÓN PARA NAVEGAR A TRANSFERENCIAS */}
                <Link
                  to="/transfer"
                  className="bg-nord-8 hover:bg-nord-10 text-nord-0 font-bold py-2 px-6 rounded-full transition-colors inline-flex items-center gap-2"
                >
                  <span>💸</span> Enviar Dinero
                </Link>
              </div>

              <div className="bg-nord-1 p-6 rounded-xl shadow-lg border border-nord-2">
                <h3 className="text-xl font-bold text-nord-8 mb-4">
                  Últimos Movimientos
                </h3>
                {!dashboardData || dashboardData.transactions.length === 0 ? (
                  <p className="text-nord-4 text-center py-4">
                    No tienes movimientos recientes.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center bg-nord-0 p-4 rounded-lg border border-nord-3"
                      >
                        <div>
                          <p className="text-nord-6 font-medium">
                            {tx.reference}
                          </p>
                          <p className="text-nord-4 text-sm">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`text-lg font-bold ${tx.tx_type === "DEPOSIT" ? "text-nord-14" : "text-nord-11"}`}
                        >
                          {tx.tx_type === "DEPOSIT" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 bg-nord-1 p-6 rounded-xl shadow-lg border border-nord-2 self-start">
              <h3 className="text-xl font-bold text-nord-13 mb-4">
                Estado de Cuenta
              </h3>
              {installments.length === 0 ? (
                <p className="text-nord-4 text-center py-4 text-sm">
                  No tienes cuotas registradas.
                </p>
              ) : (
                <div className="space-y-4">
                  {installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="bg-nord-0 p-4 rounded-lg border border-nord-3 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-nord-6 font-medium text-sm">
                          {inst.description}
                        </p>
                        {renderStatusBadge(inst.status)}
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-nord-4 text-xs">
                          Vence: {new Date(inst.due_date).toLocaleDateString()}
                        </span>
                        <span className="text-nord-6 font-bold">
                          {formatCurrency(inst.amount)}
                        </span>
                      </div>

                      {/* ¡BOTÓN CONECTADO! Ejecuta handlePay pasándole el ID de la cuota */}
                      {inst.status !== "PAID" && (
                        <button
                          onClick={() => handlePay(inst.id)}
                          disabled={isPaying}
                          className="mt-3 w-full bg-nord-8 hover:bg-nord-10 text-nord-0 text-sm font-bold py-2 rounded transition-colors disabled:opacity-50"
                        >
                          {isPaying ? "Procesando..." : "Pagar Cuota"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
    </div>
  );
}
