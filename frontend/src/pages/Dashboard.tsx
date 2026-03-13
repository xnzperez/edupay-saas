import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { sileo } from "sileo";
import { getWalletDashboard } from "../services/wallet";
import type { WalletDashboardResponse } from "../types/wallet";

export default function Dashboard() {
  const navigate = useNavigate();
  // Estado para almacenar los datos de la billetera
  const [dashboardData, setDashboardData] =
    useState<WalletDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect se ejecuta automáticamente al cargar el componente
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getWalletDashboard();
        setDashboardData(data);
      } catch (error: any) {
        // Si el token expiró o hay error, Sileo avisa y expulsamos al usuario
        sileo.error(
          error.response?.data?.error || "Error al cargar la billetera",
        );
        if (error.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    navigate("/login");
  };

  // Función auxiliar para formatear a Pesos Colombianos (COP)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
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
        ) : dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta de Saldo */}
            <div className="col-span-1 md:col-span-3 bg-nord-1 p-8 rounded-xl shadow-lg border border-nord-2 text-center">
              <p className="text-nord-4 text-lg mb-2">Saldo Disponible</p>
              <h2 className="text-5xl font-bold text-nord-14">
                {formatCurrency(dashboardData.current_balance)}
              </h2>
            </div>

            {/* Historial de Movimientos */}
            <div className="col-span-1 md:col-span-3 bg-nord-1 p-6 rounded-xl shadow-lg border border-nord-2">
              <h3 className="text-xl font-bold text-nord-8 mb-4">
                Últimos Movimientos
              </h3>

              {dashboardData.transactions.length === 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
