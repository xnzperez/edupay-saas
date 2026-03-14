import { Outlet } from "react-router";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    // El fondo base de toda la aplicación ahora se define aquí
    <div className="min-h-screen bg-nord-0">
      {/* El Navbar siempre estará arriba */}
      <Navbar />

      {/* El contenido principal de la página */}
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* <Outlet /> es el "agujero" donde React Router inyectará dinámicamente 
              el componente de la ruta actual (Dashboard o Transfer) */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
