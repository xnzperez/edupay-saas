export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Resumen Ejecutivo
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Monitoreo en tiempo real de los flujos de capital de la universidad.
        </p>
      </div>

      {/* KPIs (Key Performance Indicators) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Recaudado (Mensual)
          </p>
          <h3 className="text-4xl font-black text-nord-8 mt-3">$ 45.2M</h3>
          <p className="text-xs text-nord-14 mt-2 font-bold">
            +12% vs mes anterior
          </p>
        </div>

        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Deuda Pendiente
          </p>
          <h3 className="text-4xl font-black text-nord-11 mt-3">$ 12.8M</h3>
          <p className="text-xs text-nord-11 mt-2 font-bold">
            Requiere atención (14 morosos)
          </p>
        </div>

        <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Estudiantes Activos
          </p>
          <h3 className="text-4xl font-black text-nord-6 mt-3">1,204</h3>
          <p className="text-xs text-nord-4 mt-2 font-medium">
            Con billetera habilitada
          </p>
        </div>
      </div>
    </div>
  );
}
