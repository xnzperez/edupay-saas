import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Rutas disponibles para el cajero
  const navItems = [
    { name: "Inicio", path: "/admin", exact: true },
    { name: "Estudiantes", path: "/admin/students" },
    { name: "Deudas y Cobros", path: "/admin/billing" },
    { name: "Transacciones", path: "/admin/transactions" },
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
