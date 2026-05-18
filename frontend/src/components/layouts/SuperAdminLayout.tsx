import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import ThemeToggle from "../ThemeToggle";

// ==========================================
// OUT-OF-COMPONENT RENDER FUNCTIONS & HELPERS
// ==========================================

const getNavItems = (isMaster: boolean) =>
  isMaster
    ? [
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
        { name: "Mi Universidad", path: "/superadmin/my-tenant", exact: true },
        { name: "Gestión de Cajeros", path: "/superadmin/admins", exact: true },
      ];

const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
    isActive
      ? "bg-primary/10 text-primary"
      : "text-muted hover:bg-line/50 hover:text-foreground"
  }`;

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-line/80 rounded ${className}`} />
);

const NotificationBadge = ({ type }: { type: string }) => {
  const badgeColors: Record<string, string> = {
    success: "bg-success/15 text-success border-success/20",
    warning: "bg-warning/15 text-warning border-warning/20",
    danger: "bg-danger/15 text-danger border-danger/20",
    default: "bg-primary/15 text-primary border-primary/20",
  };
  const colorClass = badgeColors[type] || badgeColors.default;
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${colorClass}`}
    >
      {type}
    </span>
  );
};

const NotificationItem = ({ notification }: { notification: any }) => (
  <div className="p-4 border-b border-line hover:bg-surface/80 transition-colors group cursor-default">
    <div className="flex justify-between items-center mb-2">
      <NotificationBadge type={notification.type} />
      <span className="text-[10px] text-muted font-medium">
        {new Date(notification.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
      {notification.title}
    </p>
    <p className="text-xs text-muted leading-relaxed mt-1 line-clamp-2">
      {notification.description}
    </p>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const MASTER_TENANT_ID = import.meta.env.VITE_MASTER_TENANT_ID;
  const isMaster = user?.tenant_id === MASTER_TENANT_ID;

  const { notifications, markAsRead, clearNotifications } =
    useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const navItems = getNavItems(isMaster);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleNotifications = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) markAsRead();
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* --- OVERLAY MÓVIL --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --- SIDEBAR RESPONSIVO --- */}
      <aside
        className={`fixed md:relative w-72 h-full bg-surface border-r border-line flex flex-col shadow-2xl md:shadow-none z-50 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-16 px-6 border-b border-line flex justify-between items-center bg-surface shrink-0">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            EduPay
            <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full ml-1">
              SaaS
            </span>
          </h1>
          {/* Botón cerrar en móvil */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-line transition-colors"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 text-[11px] font-bold text-muted uppercase tracking-wider mb-4">
            Administración Global
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setIsSidebarOpen(false)}
              className={getNavLinkClass}
            >
              {({ isActive }) => (
                <>
                  {/* Indicador lateral activo */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-line bg-surface shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-danger bg-danger/5 hover:bg-danger hover:white rounded-xl transition-all duration-200 border border-danger/10 hover:border-danger hover:shadow-lg hover:shadow-danger/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-full relative w-full overflow-hidden bg-background">
        <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-line flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 w-full">
          {/* Izquierda */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-line transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {!user ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h2 className="text-sm md:text-base font-bold text-foreground truncate">
                {isMaster ? "Consola Maestra" : "Panel de Administración"}
              </h2>
            )}
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* NOTIFICACIONES */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className={`relative w-10 h-10 flex items-center justify-center transition-all duration-200 rounded-xl ${
                  isNotifOpen
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-muted hover:bg-line hover:text-foreground"
                }`}
                aria-label="Notificaciones"
              >
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
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-surface animate-pulse" />
                )}
              </button>

              {/* DROPDOWN */}
              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-[340px] bg-surface border border-line rounded-2xl shadow-2xl shadow-black/5 z-50 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-line bg-surface/50 flex justify-between items-center backdrop-blur-sm">
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                        Notificaciones
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-danger/10 text-danger text-[10px] leading-none">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </h4>
                      <button
                        onClick={clearNotifications}
                        className="text-[11px] text-muted hover:text-danger font-bold transition-colors"
                      >
                        Limpiar todo
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-background/50">
                      {notifications.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-line rounded-full flex items-center justify-center mb-3">
                            <svg
                              className="w-6 h-6 text-muted"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Bandeja limpia
                          </p>
                          <p className="text-xs text-muted mt-1">
                            No hay actividad reciente.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <NotificationItem key={n.id} notification={n} />
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PERFIL & THEME TOGGLE */}
            <div className="flex items-center gap-3 border-l border-line pl-3 md:pl-4 h-8">
              <ThemeToggle />

              <div className="hidden md:flex items-center gap-3 pl-2">
                <div className="flex flex-col items-end">
                  {!user ? (
                    <>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-foreground leading-none">
                        {isMaster ? "Root Maestro" : "SuperAdmin Local"}
                      </span>
                      <span className="text-[11px] text-muted mt-1 font-medium font-mono uppercase">
                        ID: {user.sub ? user.sub.split("-")[0] : "SISTEMA"}
                      </span>
                    </>
                  )}
                </div>
                {!user ? (
                  <Skeleton className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm ring-1 ring-primary/20 text-sm">
                    {isMaster ? "SA" : "AD"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE LA PÁGINA */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
