import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore"; // Importamos el store

export default function ProtectedRoute() {
  // Ahora React está "suscrito" al token. Si se borra, este componente reaccionará al instante.
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
