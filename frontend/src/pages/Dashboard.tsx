import { useNavigate } from "react-router";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Destruimos el token y redirigimos al login
    localStorage.removeItem("jwt_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-nord-0 p-8">
      <div className="max-w-4xl mx-auto bg-nord-1 rounded-xl shadow-lg border border-nord-2 p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-nord-8">Panel Estudiantil</h1>
          <button
            onClick={handleLogout}
            className="bg-nord-11 hover:bg-opacity-80 text-nord-6 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="bg-nord-0 p-6 rounded-lg border border-nord-3">
          <p className="text-nord-4 text-lg">
            Bienvenido. Tu conexión segura con el backend está establecida.
          </p>
        </div>
      </div>
    </div>
  );
}
