import { useState, useEffect } from "react";
import { Link } from "react-router"; // Asegúrate de importar esto si usas react-router-dom / react-router
import { getBillingStats } from "../../services/billing";
import type { BillingStatsDTO } from "../../types/billing";

export default function AdminDashboard() {
  const [stats, setStats] = useState<BillingStatsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getBillingStats();
        setStats(data);
      } catch (error: any) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-nord-3/40 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="h-32 bg-nord-1/80 rounded-2xl border border-nord-2/50"></div>
          <div className="h-32 bg-nord-1/80 rounded-2xl border border-nord-2/50"></div>
          <div className="h-32 bg-nord-1/80 rounded-2xl border border-nord-2/50"></div>
        </div>
      </div>
    );
  }

  // Cálculos para la gráfica de distribución
  const totalCapital = stats.total_collected + stats.total_debt;
  const collectedPercentage =
    totalCapital === 0 ? 0 : (stats.total_collected / totalCapital) * 100;
  const debtPercentage =
    totalCapital === 0 ? 0 : (stats.total_debt / totalCapital) * 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Resumen Ejecutivo
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Monitoreo en tiempo real de los flujos de capital de la universidad.
        </p>
      </div>

      {/* 1. KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:border-nord-8 transition-colors">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Capital Recaudado
          </p>
          <h3 className="text-4xl font-black text-nord-8 mt-3">
            ${stats.total_collected.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-nord-14 mt-2 font-bold">
            Ingresos liquidados en firme
          </p>
        </div>

        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:border-nord-11 transition-colors">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Deuda Pendiente
          </p>
          <h3 className="text-4xl font-black text-nord-11 mt-3">
            ${stats.total_debt.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-nord-11 mt-2 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-nord-11 animate-pulse"></span>
            Requiere atención ({stats.overdue_count} morosos)
          </p>
        </div>

        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:border-nord-4 transition-colors">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Estudiantes Activos
          </p>
          <h3 className="text-4xl font-black text-nord-6 mt-3">
            {stats.active_students.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-nord-4 mt-2 font-medium">
            Con billetera financiera habilitada
          </p>
        </div>
      </div>

      {/* 2. Distribución de Cartera (Gráfica visual con Tailwind puro) */}
      <div className="bg-nord-1 p-8 rounded-2xl border border-nord-2 shadow-sm mt-8">
        <h3 className="text-lg font-bold text-nord-6 mb-6">
          Salud de la Cartera Institucional
        </h3>

        {totalCapital === 0 ? (
          <p className="text-nord-4 text-sm text-center py-4 bg-nord-0 rounded-lg border border-dashed border-nord-3">
            No hay flujos de capital registrados para calcular la distribución.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold text-nord-4">
              <span>Recaudado ({collectedPercentage.toFixed(1)}%)</span>
              <span>Por Cobrar ({debtPercentage.toFixed(1)}%)</span>
            </div>

            {/* Barra de progreso combinada */}
            <div className="w-full h-4 bg-nord-0 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-nord-8 transition-all duration-1000"
                style={{ width: `${collectedPercentage}%` }}
              ></div>
              <div
                className="h-full bg-nord-11 transition-all duration-1000 opacity-80"
                style={{ width: `${debtPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Acciones Rápidas */}
      <div>
        <h3 className="text-lg font-bold text-nord-6 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/billing"
            className="flex items-center p-4 bg-nord-1 border border-nord-2 rounded-xl hover:bg-nord-2 transition-colors group"
          >
            <div className="p-3 bg-nord-0 rounded-lg text-nord-8 group-hover:text-nord-6 transition-colors mr-4">
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-nord-6">Emitir Nuevo Cobro</p>
              <p className="text-xs text-nord-4 mt-1">
                Generar una obligación financiera a un estudiante.
              </p>
            </div>
          </Link>

          <Link
            to="/admin/debts"
            className="flex items-center p-4 bg-nord-1 border border-nord-2 rounded-xl hover:bg-nord-2 transition-colors group"
          >
            <div className="p-3 bg-nord-0 rounded-lg text-nord-13 group-hover:text-nord-6 transition-colors mr-4">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-nord-6">Revisar Morosos</p>
              <p className="text-xs text-nord-4 mt-1">
                Ver la tabla maestra de deudas activas.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
