import { useState, useEffect } from "react";

// Simulamos una respuesta de la API de Go
const mockMetrics = {
  totalRevenue: "$145,250.00",
  activeTenants: 12,
  defaultRate: "4.2%",
  dailyTransactions: 843,
  growth: "+14.5%",
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // Simulamos el tiempo de red para que se vea el "Skeleton" cargando
  // Esto le da un aspecto súper profesional y real a la demo
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Resumen Global
          </h1>
          <p className="text-foreground text-sm mt-1">
            Métricas de rendimiento de todos los inquilinos (SaaS)
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-muted text-foreground text-sm font-bold rounded-lg hover:bg-line transition-colors border border-line">
            Exportar PDF
          </button>
          <button className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-md">
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* --- GRILLA DE WIDGETS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {/* Widget 1: Ingresos Totales */}
        <div className="bg-surface p-6 rounded-xl border border-line shadow-lg relative overflow-hidden group hover:border-primary transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg
              className="w-16 h-16 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">
            Ingresos (MRR)
          </p>
          <h3 className="text-3xl font-black text-foreground mt-2">
            {loading ? "..." : mockMetrics.totalRevenue}
          </h3>
          <p className="text-xs font-bold text-success mt-2 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {mockMetrics.growth} vs mes anterior
          </p>
        </div>

        {/* Widget 2: Inquilinos Activos */}
        <div className="bg-surface p-6 rounded-xl border border-line shadow-lg relative overflow-hidden group hover:border-primary transition-colors">
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">
            Universidades Activas
          </p>
          <h3 className="text-3xl font-black text-foreground mt-2">
            {loading ? "..." : mockMetrics.activeTenants}
          </h3>
          <p className="text-xs font-bold text-primary mt-2">
            Plataforma operando al 100%
          </p>
        </div>

        {/* Widget 3: Transacciones Diarias */}
        <div className="bg-surface p-6 rounded-xl border border-line shadow-lg relative overflow-hidden group hover:border-primary-hover transition-colors">
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">
            Transacciones Hoy
          </p>
          <h3 className="text-3xl font-black text-foreground mt-2">
            {loading ? "..." : mockMetrics.dailyTransactions}
          </h3>
          <p className="text-xs font-bold text-foreground mt-2">
            A través de todos los tenants
          </p>
        </div>

        {/* Widget 4: Tasa de Morosidad */}
        <div className="bg-surface p-6 rounded-xl border border-line shadow-lg relative overflow-hidden group hover:border-danger transition-colors">
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">
            Tasa de Morosidad Global
          </p>
          <h3 className="text-3xl font-black text-foreground mt-2">
            {loading ? "..." : mockMetrics.defaultRate}
          </h3>
          <p className="text-xs font-bold text-danger mt-2 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            -0.5% reducción general
          </p>
        </div>
      </div>

      {/* --- ESPACIO PARA GRÁFICO O TABLA (Siguiente paso) --- */}
      <div className="mt-8 bg-surface rounded-xl border border-line p-6 shadow-lg h-64 flex items-center justify-center border-dashed">
        <p className="text-muted font-bold text-lg text-center">
          [Aquí irá el gráfico de ingresos o la tabla de últimas universidades
          registradas]
        </p>
      </div>
    </div>
  );
}
