import { Navigate, Outlet } from "react-router-dom";

export const PrivateRoute = () => {
  // Por ahora, simulamos el check del JWT buscando en el localStorage.
  // Más adelante usaremos un estado global (Zustand o Context).
  const isAuthenticated = !!localStorage.getItem("token");

  // Si está autenticado, renderiza los hijos (Outlet).
  // Si no, lo redirige al login sin dejar rastro en el historial.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
