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
          <h1 className="text-2xl md:text-3xl font-extrabold text-nord-6">
            Resumen Global
          </h1>
          <p className="text-nord-4 text-sm mt-1">
            Métricas de rendimiento de todos los inquilinos (SaaS)
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-nord-3 text-nord-6 text-sm font-bold rounded-lg hover:bg-nord-2 transition-colors border border-nord-2">
            Exportar PDF
          </button>
          <button className="px-4 py-2 bg-nord-8 text-nord-0 text-sm font-bold rounded-lg hover:bg-nord-9 transition-colors shadow-md">
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* --- GRILLA DE WIDGETS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {/* Widget 1: Ingresos Totales */}
        <div className="bg-nord-1 p-6 rounded-xl border border-nord-2 shadow-lg relative overflow-hidden group hover:border-nord-8 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg
              className="w-16 h-16 text-nord-8"
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
          <p className="text-sm font-bold text-nord-4 uppercase tracking-wider">
            Ingresos (MRR)
          </p>
          <h3 className="text-3xl font-black text-nord-6 mt-2">
            {loading ? "..." : mockMetrics.totalRevenue}
          </h3>
          <p className="text-xs font-bold text-nord-14 mt-2 flex items-center gap-1">
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
        <div className="bg-nord-1 p-6 rounded-xl border border-nord-2 shadow-lg relative overflow-hidden group hover:border-nord-13 transition-colors">
          <p className="text-sm font-bold text-nord-4 uppercase tracking-wider">
            Universidades Activas
          </p>
          <h3 className="text-3xl font-black text-nord-6 mt-2">
            {loading ? "..." : mockMetrics.activeTenants}
          </h3>
          <p className="text-xs font-bold text-nord-13 mt-2">
            Plataforma operando al 100%
          </p>
        </div>

        {/* Widget 3: Transacciones Diarias */}
        <div className="bg-nord-1 p-6 rounded-xl border border-nord-2 shadow-lg relative overflow-hidden group hover:border-nord-9 transition-colors">
          <p className="text-sm font-bold text-nord-4 uppercase tracking-wider">
            Transacciones Hoy
          </p>
          <h3 className="text-3xl font-black text-nord-6 mt-2">
            {loading ? "..." : mockMetrics.dailyTransactions}
          </h3>
          <p className="text-xs font-bold text-nord-4 mt-2">
            A través de todos los tenants
          </p>
        </div>

        {/* Widget 4: Tasa de Morosidad */}
        <div className="bg-nord-1 p-6 rounded-xl border border-nord-2 shadow-lg relative overflow-hidden group hover:border-nord-11 transition-colors">
          <p className="text-sm font-bold text-nord-4 uppercase tracking-wider">
            Tasa de Morosidad Global
          </p>
          <h3 className="text-3xl font-black text-nord-6 mt-2">
            {loading ? "..." : mockMetrics.defaultRate}
          </h3>
          <p className="text-xs font-bold text-nord-11 mt-2 flex items-center gap-1">
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
      <div className="mt-8 bg-nord-1 rounded-xl border border-nord-2 p-6 shadow-lg h-64 flex items-center justify-center border-dashed">
        <p className="text-nord-3 font-bold text-lg text-center">
          [Aquí irá el gráfico de ingresos o la tabla de últimas universidades
          registradas]
        </p>
      </div>
    </div>
  );
}
