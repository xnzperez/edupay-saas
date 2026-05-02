import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Rutas disponibles para el cajero (ahora con íconos escalables)
  const navItems = [
    {
      name: "Inicio",
      path: "/admin",
      exact: true,
      icon: (
        <svg
          className="w-5 h-5 mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Estudiantes",
      path: "/admin/students",
      icon: (
        <svg
          className="w-5 h-5 mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: "Deudas y Cobros",
      path: "/admin/billing",
      icon: (
        <svg
          className="w-5 h-5 mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "Transacciones",
      path: "/admin/transactions",
      icon: (
        <svg
          className="w-5 h-5 mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      name: "Obligaciones", // Nueva ruta de la tabla maestra
      path: "/admin/debts",
      icon: (
        <svg
          className="w-5 h-5 mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-nord-0 text-nord-6 font-sans">
      {/* --- SIDEBAR LATERAL FIJO --- */}
      <aside className="w-64 bg-nord-1 border-r border-nord-2 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-nord-2">
          <h1 className="text-2xl font-extrabold text-nord-8 tracking-tight">
            EduPay{" "}
            <span className="text-sm font-medium text-nord-4 ml-1">Admin</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-nord-4 uppercase tracking-wider mb-4 mt-2">
            Panel de Operaciones
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-nord-8 text-nord-0 shadow-md translate-x-1"
                    : "text-nord-4 hover:bg-nord-2 hover:text-nord-6"
                }`
              }
            >
              {/* Renderizamos el ícono y luego el texto */}
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-nord-2 bg-nord-1/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-nord-11 hover:bg-nord-11 hover:text-nord-0 rounded-lg transition-all border border-transparent hover:border-nord-11 hover:shadow-[0_0_15px_rgba(191,97,106,0.4)]"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar opcional para darle más estructura */}
        <header className="h-16 bg-nord-0/80 backdrop-blur-sm border-b border-nord-2 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-nord-4">
            Centro de Control Financiero
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-nord-3 flex items-center justify-center font-bold text-nord-0 shadow-inner">
              C
            </div>
            <span className="text-sm font-bold tracking-wide">Cajero UCC</span>
          </div>
        </header>

        {/* El "Outlet" inyecta las páginas aquí adentro */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
