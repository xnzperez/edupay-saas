import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  getBillingStats,
  getCollectionStats,
  type CollectionStatsDTO,
} from "../../services/billing"; // Ajusta si usas otra ruta
import type { BillingStatsDTO } from "../../types/billing";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981", // Verde (Éxito/Recaudado)
  PENDING: "#3b82f6", // Azul (Pendiente/Por Cobrar)
  OVERDUE: "#ef4444", // Rojo (Morosos)
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Recaudado",
  PENDING: "Por Cobrar",
  OVERDUE: "En Mora",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<BillingStatsDTO | null>(null);
  const [collectionStats, setCollectionStats] = useState<CollectionStatsDTO[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        // Fetching concurrente: Optimizamos la red pidiendo ambas cosas al mismo tiempo
        const [billingData, collectionData] = await Promise.all([
          getBillingStats(),
          getCollectionStats(),
        ]);

        setStats(billingData);
        setCollectionStats(collectionData);
      } catch (error: unknown) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-muted/40 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="h-32 bg-surface/80 rounded-2xl border border-line/50"></div>
          <div className="h-32 bg-surface/80 rounded-2xl border border-line/50"></div>
          <div className="h-32 bg-surface/80 rounded-2xl border border-line/50"></div>
        </div>
        <div className="h-64 bg-surface/80 rounded-2xl border border-line/50 mt-8"></div>
      </div>
    );
  }

  // Preparamos los datos para Recharts
  const chartData = collectionStats.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.total_amount,
    count: item.count,
    color: STATUS_COLORS[item.status] || "#D8DEE9", // Default foreground
  }));

  // Custom Tooltip para el gráfico
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-line p-3 rounded-lg shadow-xl">
          <p className="text-foreground font-bold">{data.name}</p>
          <p className="text-foreground text-sm mt-1">
            Monto:{" "}
            <span className="font-bold text-primary">
              ${data.value.toLocaleString("es-CO")}
            </span>
          </p>
          <p className="text-foreground text-sm">
            Cuotas:{" "}
            <span className="font-bold text-foreground">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Resumen Ejecutivo
        </h1>
        <p className="text-foreground mt-2 font-medium">
          Monitoreo en tiempo real de los flujos de capital de la universidad.
        </p>
      </div>

      {/* 1. KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm hover:border-primary transition-colors">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Capital Recaudado
          </p>
          <h3 className="text-4xl font-black text-primary mt-3">
            ${stats.total_collected.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-success mt-2 font-bold">
            Ingresos liquidados en firme
          </p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm hover:border-danger transition-colors">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Deuda Pendiente
          </p>
          <h3 className="text-4xl font-black text-danger mt-3">
            ${stats.total_debt.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-danger mt-2 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
            Requiere atención ({stats.overdue_count} morosos)
          </p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm hover:border-foreground transition-colors">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Estudiantes Activos
          </p>
          <h3 className="text-4xl font-black text-foreground mt-3">
            {stats.active_students.toLocaleString("es-CO")}
          </h3>
          <p className="text-xs text-foreground mt-2 font-medium">
            Con billetera financiera habilitada
          </p>
        </div>
      </div>

      {/* 2. Distribución de Cartera (Recharts) */}
      <div className="bg-surface p-8 rounded-2xl border border-line shadow-sm mt-8">
        <h3 className="text-lg font-bold text-foreground mb-6">
          Salud de la Cartera Institucional
        </h3>

        {chartData.length === 0 ? (
          <p className="text-foreground text-sm text-center py-10 bg-background rounded-lg border border-dashed border-line">
            No hay flujos de capital registrados para graficar.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80} // Esto lo convierte en un gráfico Donut (Aro)
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{
                    color: "#D8DEE9",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Acciones Rápidas */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/billing"
            className="flex items-center p-4 bg-surface border border-line rounded-xl hover:bg-line transition-colors group"
          >
            <div className="p-3 bg-background rounded-lg text-primary group-hover:text-foreground transition-colors mr-4">
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
              <p className="font-bold text-foreground">Emitir Nuevo Cobro</p>
              <p className="text-xs text-foreground mt-1">
                Generar una obligación financiera a un estudiante.
              </p>
            </div>
          </Link>

          <Link
            to="/admin/debts"
            className="flex items-center p-4 bg-surface border border-line rounded-xl hover:bg-line transition-colors group"
          >
            <div className="p-3 bg-background rounded-lg text-primary group-hover:text-foreground transition-colors mr-4">
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
              <p className="font-bold text-foreground">Revisar Morosos</p>
              <p className="text-xs text-foreground mt-1">
                Ver la tabla maestra de deudas activas.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
