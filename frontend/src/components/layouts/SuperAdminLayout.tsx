import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import ThemeToggle from "../ThemeToggle";

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const MASTER_TENANT_ID = import.meta.env.VITE_MASTER_TENANT_ID;
  const isMaster = user?.tenant_id === MASTER_TENANT_ID;

  // Store de Notificaciones
  const { notifications, markAsRead, clearNotifications } =
    useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Conteo de no leídas
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Menú de navegación dinámico según el tipo de administrador
  const navItems = isMaster
    ? [
        // Menú exclusivo del Dueño del SaaS
        {
          name: "Universidades (Inquilinos)",
          path: "/superadmin/tenants",
          exact: true,
        },
        {
          name: "Nueva Universidad",
          path: "/superadmin/create-tenant",
          exact: true,
        },
      ]
    : [
        // Menú exclusivo del Administrador Local (Cajero/UCC)
        {
          name: "Mi Universidad",
          path: "/superadmin/my-tenant", // Crearemos esta vista luego
          exact: true,
        },
        {
          name: "Gestión de Cajeros",
          path: "/superadmin/admins",
          exact: true,
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
            <span className="text-sm font-medium text-success ml-1">SaaS</span>
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
            Administración Global
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-success text-background shadow-md translate-x-1"
                    : "text-foreground hover:bg-line hover:text-foreground"
                }`
              }
            >
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
          {/* Lado Izquierdo del Header */}
          <div className="flex items-center gap-4">
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
              {isMaster ? "Consola Maestra SaaS" : "Panel de Administración"}
            </h2>
          </div>

          {/* Lado Derecho del Header (Notificaciones y Usuario) */}
          <div className="flex items-center gap-4">
            {/* --- SISTEMA DE NOTIFICACIONES REAL --- */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen) markAsRead();
                }}
                className={`relative p-2 transition-colors rounded-full ${isNotifOpen ? "bg-line text-primary" : "text-foreground hover:text-primary"}`}
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* DROPDOWN DE NOTIFICACIONES */}
              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsNotifOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-80 bg-surface border border-line rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-line bg-line/30 flex justify-between items-center">
                      <h4 className="font-bold text-foreground text-sm">
                        Registro de Actividad
                      </h4>
                      <button
                        onClick={clearNotifications}
                        className="text-[10px] text-danger hover:underline uppercase font-bold transition-all"
                      >
                        Limpiar
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted text-sm italic">
                          No hay actividad reciente
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-4 border-b border-line hover:bg-line/20 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  n.type === "success"
                                    ? "bg-success/20 text-success"
                                    : n.type === "warning"
                                      ? "bg-danger/20 text-danger"
                                      : "bg-primary/20 text-primary"
                                }`}
                              >
                                {n.type}
                              </span>
                              <span className="text-[10px] text-muted">
                                {new Date(n.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-foreground">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-foreground leading-relaxed mt-1">
                              {n.description}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* --- FIN SISTEMA DE NOTIFICACIONES --- */}

            <div className="flex items-center gap-3 border-l border-line pl-4">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-success flex items-center justify-center font-bold text-background shadow-inner text-sm md:text-base">
                SA
              </div>
              <span className="hidden md:block text-sm font-bold tracking-wide text-foreground">
                Root
              </span>
            </div>
          </div>
          <ThemeToggle />
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
