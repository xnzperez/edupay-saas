import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { sileo } from "sileo";
import { getWalletDashboard } from "../services/wallet";
import { getMyInstallments } from "../services/billing";
import type { WalletDashboardResponse } from "../types/wallet";
import type { Installment } from "../types/billing";

export default function Dashboard() {
  const navigate = useNavigate();

  // Estados para Billetera y Facturación
  const [dashboardData, setDashboardData] =
    useState<WalletDashboardResponse | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Promise.all ejecuta ambas peticiones HTTP al mismo tiempo, reduciendo el tiempo de carga a la mitad
        const [walletData, billingData] = await Promise.all([
          getWalletDashboard(),
          getMyInstallments(),
        ]);

        setDashboardData(walletData);
        setInstallments(billingData.installments || []); // Prevenimos errores si viene null
      } catch (error: any) {
        sileo.error(
          error.response?.data?.error ||
            "Error al cargar los datos del servidor",
        );
        if (error.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    navigate("/login");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Función auxiliar para renderizar una etiqueta (badge) con el color correcto según el estado
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

  return (
    <div className="min-h-screen bg-nord-0 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex justify-between items-center bg-nord-1 p-6 rounded-xl shadow-lg border border-nord-2">
          <h1 className="text-3xl font-bold text-nord-8">Panel Estudiantil</h1>
          <button
            onClick={handleLogout}
            className="bg-nord-11 hover:bg-opacity-80 text-nord-6 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-nord-4 py-10">
            Cargando tu información financiera...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Saldo y Movimientos (Ocupa 2/3 del espacio en pantallas grandes) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de Saldo */}
              <div className="bg-nord-1 p-8 rounded-xl shadow-lg border border-nord-2 text-center">
                <p className="text-nord-4 text-lg mb-2">Saldo Disponible</p>
                <h2 className="text-5xl font-bold text-nord-14">
                  {dashboardData
                    ? formatCurrency(dashboardData.current_balance)
                    : "$0"}
                </h2>
              </div>

              {/* Historial de Movimientos */}
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

            {/* Columna Derecha: Deudas Pendientes (Ocupa 1/3 del espacio) */}
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

                      {/* Botón de pago condicional: Solo aparece si está PENDIENTE o VENCIDO */}
                      {inst.status !== "PAID" && (
                        <button className="mt-3 w-full bg-nord-8 hover:bg-nord-10 text-nord-0 text-sm font-bold py-2 rounded transition-colors">
                          Pagar Cuota
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
