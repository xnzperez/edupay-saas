import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore";

interface RoleRouteProps {
  allowedRole: "ADMIN" | "STUDENT";
}

export default function RoleRoute({ allowedRole }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  // Si no hay usuario, pa' fuera
  if (!user) return <Navigate to="/login" replace />;

  // Si el rol no coincide, lo mandamos a su panel correspondiente
  if (user.role !== allowedRole) {
    return (
      <Navigate to={user.role === "ADMIN" ? "/admin" : "/student"} replace />
    );
  }

  // Si todo está bien, renderiza las rutas hijas
  return <Outlet />;
}
