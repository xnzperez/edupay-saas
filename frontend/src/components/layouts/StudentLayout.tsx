import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "../ThemeToggle";

export default function StudentLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/student", exact: true },
    { name: "Transferir", path: "/student/transfer", exact: false },
    { name: "Tienda", path: "/student/store", exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* --- TOP NAVBAR --- */}
      <nav className="bg-surface/90 backdrop-blur-md border-b border-line sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex justify-between items-center">
          {/* Sección Izquierda: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-background shadow-sm">
              E
            </div>
            <h1 className="text-xl font-bold text-primary tracking-wide">
              EduPay
            </h1>
          </div>

          {/* Sección Central: Enlaces Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `font-bold text-sm transition-all duration-200 border-b-2 py-5 ${
                    isActive
                      ? "text-primary border-primary"
                      : "text-foreground border-transparent hover:text-foreground hover:border-foreground"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* Sección Derecha: Usuario y Logout Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-line pr-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white text-sm">
                E
              </div>
              <span className="text-sm font-bold tracking-wide text-foreground">
                {user?.role === "STUDENT" ? "Estudiante" : "Usuario"}
              </span>
            </div>

            {/* --- BOTÓN DE TEMA --- */}
            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="text-danger hover:text-background hover:bg-danger border border-danger font-bold py-1.5 px-4 rounded-lg transition-all text-sm shadow-[0_0_10px_rgba(191,97,106,0.1)] hover:shadow-[0_0_15px_rgba(191,97,106,0.4)]"
            >
              Salir
            </button>
          </div>

          {/* --- BOTÓN HAMBURGUESA (Móvil) --- */}
          <button
            className="md:hidden p-2 text-foreground hover:text-primary focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
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
            )}
          </button>
        </div>

        {/* --- MENÚ DESPLEGABLE (Móvil) --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-surface border-t border-line absolute w-full shadow-xl animate-fade-in">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-3 rounded-md text-base font-bold transition-colors ${
                      isActive
                        ? "bg-primary text-background"
                        : "text-foreground hover:bg-line hover:text-foreground"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
              <div className="pt-4 mt-2 border-t border-line">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-3 py-3 text-base font-bold text-danger hover:bg-danger hover:text-background rounded-md border border-danger transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden relative">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
