import { NavLink, useNavigate } from "react-router";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    navigate("/login");
  };

  return (
    // Contenedor principal del Navbar usando el color secundario de la paleta Nord
    <nav className="bg-nord-1 border-b border-nord-2 px-8 py-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Sección Izquierda: Logo y Enlaces */}
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-nord-8 tracking-wide">
            EduPay
          </h1>

          <div className="flex gap-4">
            {/* NavLink es especial en React Router: sabe cuándo está "activo" según la URL actual.
                Usamos esto para cambiar el color del texto si el usuario está en esa página. */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `font-medium transition-colors ${isActive ? "text-nord-8" : "text-nord-4 hover:text-nord-6"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/transfer"
              className={({ isActive }) =>
                `font-medium transition-colors ${isActive ? "text-nord-8" : "text-nord-4 hover:text-nord-6"}`
              }
            >
              Transferir
            </NavLink>
          </div>
        </div>

        {/* Sección Derecha: Botón de Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="text-nord-11 hover:text-nord-0 hover:bg-nord-11 border border-nord-11 font-bold py-1.5 px-4 rounded transition-all text-sm"
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
