import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);

  // Si no hay token en absoluto, devuélvelo al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si tiene token, déjalo pasar al siguiente filtro
  return <Outlet />;
}
