import React, { useEffect, useState } from "react";
import {
  getGlobalStats,
  type GlobalStatsResponse,
} from "../../services/tenant";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, DollarSign, Activity } from "lucide-react";

// Extracting type from response for easier typing
type StatsData = GlobalStatsResponse["data"];

// Premium Linear/Stripe style color palette for the PieChart
const CHART_COLORS = [
  "var(--color-primary)",
  "#10b981", // success
  "#f59e0b", // warning
  "#ef4444", // danger
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#f43f5e", // rose
];

export const GlobalDashboard: React.FC = () => {
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const stats = await getGlobalStats();
        setData(stats);
      } catch (err) {
        console.error("Error fetching global stats:", err);
        setError("No se pudo cargar la telemetría global. Intenta nuevamente.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactNumber = (number: number) => {
    if (number === 0) return "0";
    return new Intl.NumberFormat("es-CO", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-surface border border-line rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-surface border border-line rounded-xl animate-pulse opacity-50" />
        </div>

        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-surface border border-line rounded-xl animate-pulse"
            />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-surface border border-line rounded-xl animate-pulse" />
          <div className="h-[400px] bg-surface border border-line rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-surface border border-line rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-danger/10 text-danger rounded-full">
            <Activity size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Error de Conexión
            </h3>
            <p className="text-muted mt-1">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-surface border border-line rounded-lg text-foreground hover:bg-line/50 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activeTenants =
    data?.tenants_stats.filter((t) => t.is_active).length || 0;

  // Custom tooltip for premium look
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isVolume = payload[0].dataKey === "total_volume";
      return (
        <div className="bg-surface border border-line p-4 rounded-xl shadow-xl min-w-[200px]">
          <p className="text-muted text-sm mb-2">{label || payload[0].name}</p>
          <p className="text-foreground font-semibold text-lg flex items-center gap-2">
            {isVolume ? (
              <>
                <span className="text-primary">
                  <DollarSign size={16} />
                </span>
                {formatCurrency(payload[0].value)}
              </>
            ) : (
              <>
                <span className="text-success">
                  <Users size={16} />
                </span>
                {payload[0].value.toLocaleString("es-CO")}
              </>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Global Telemetry
          </h1>
          <p className="text-muted mt-1">
            Monitoreo financiero centralizado del ecosistema SaaS
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-muted font-medium text-sm">
              Volumen Transaccional
            </span>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-foreground tracking-tight block">
              {formatCurrency(data?.global_volume || 0)}
            </span>
            <span className="text-xs text-muted mt-1 block">
              Procesado histórico global
            </span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-muted font-medium text-sm">
              Estudiantes Totales
            </span>
            <div className="p-2.5 bg-success/10 text-success rounded-xl group-hover:bg-success group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-foreground tracking-tight block">
              {(data?.global_students || 0).toLocaleString("es-CO")}
            </span>
            <span className="text-xs text-muted mt-1 block">
              Suscritos en la plataforma
            </span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-muted font-medium text-sm">
              Universidades (Tenants)
            </span>
            <div className="p-2.5 bg-warning/10 text-warning rounded-xl group-hover:bg-warning group-hover:text-white transition-colors">
              <Activity size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-foreground tracking-tight block">
              {data?.tenants_stats.length || 0}
            </span>
            <span className="text-xs text-muted mt-1 block">
              <span className="text-success font-medium">{activeTenants}</span>{" "}
              activas actualmente
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BarChart: Volumen por Universidad */}
        <div className="bg-surface border border-line rounded-xl p-6 shadow-sm">
          <div className="mb-8">
            <h3 className="text-foreground font-semibold text-lg">
              Volumen por Universidad
            </h3>
            <p className="text-sm text-muted">
              Distribución del dinero transado por tenant
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.tenants_stats}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-line)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="tenant_name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  tickFormatter={formatCompactNumber}
                  width={60}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--color-line)", opacity: 0.2 }}
                />
                <Bar
                  dataKey="total_volume"
                  fill="var(--color-primary)"
                  radius={[6, 6, 0, 0]}
                  barSize={48}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Estudiantes por Universidad */}
        <div className="bg-surface border border-line rounded-xl p-6 shadow-sm">
          <div className="mb-8">
            <h3 className="text-foreground font-semibold text-lg">
              Cuota de Estudiantes
            </h3>
            <p className="text-sm text-muted">
              Proporción de estudiantes registrados
            </p>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data?.tenants_stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={4}
                  dataKey="total_students"
                  nameKey="tenant_name"
                  stroke="none"
                  animationDuration={1500}
                >
                  {data?.tenants_stats.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-foreground tracking-tight">
                {formatCompactNumber(data?.global_students || 0)}
              </span>
              <span className="text-xs text-muted">Total</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;
