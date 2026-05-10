import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "../ThemeToggle";

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      name: "Obligaciones",
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
    // Apuntando a /admin/deposit
    {
      name: "Pagos",
      path: "/admin/deposit",
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
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* --- OVERLAY PARA MÓVILES --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR RESPONSIVO --- */}
      <aside
        className={`fixed md:relative w-64 h-full bg-surface border-r border-line flex flex-col shadow-xl z-30 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            EduPay{" "}
            <span className="text-sm font-medium text-foreground ml-1">Admin</span>
          </h1>
          {/* Botón cerrar solo en móvil */}
          <button
            className="md:hidden text-foreground hover:text-danger font-bold text-xl"
            onClick={() => setIsSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-bold text-foreground uppercase tracking-wider mb-4 mt-2">
            Panel de Operaciones
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setIsSidebarOpen(false)} // Cierra el menú al hacer clic
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-background shadow-md translate-x-1"
                    : "text-foreground hover:bg-line hover:text-foreground"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-line bg-surface/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-danger hover:bg-danger hover:text-background rounded-lg transition-all border border-transparent hover:border-danger hover:shadow-[0_0_15px_rgba(191,97,106,0.4)]"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        <header className="h-16 bg-background/90 backdrop-blur-md border-b border-line flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 w-full shadow-sm">
          <div className="flex items-center gap-4">
            {/* --- BOTÓN HAMBURGUESA --- */}
            <button
              className="md:hidden p-2 text-foreground hover:text-primary focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
              Centro de Control Financiero
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notificaciones Mock */}
            <button className="hidden md:flex relative p-2 text-foreground hover:text-primary transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
            </button>

            <div className="flex items-center gap-3 border-l border-line pl-4">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-muted flex items-center justify-center font-bold text-background shadow-inner text-sm md:text-base">
                C
              </div>
              <span className="hidden md:block text-sm font-bold tracking-wide text-foreground">
                Cajero UCC
              </span>
            </div>

            {/* --- BOTÓN DE TEMA --- */}
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
