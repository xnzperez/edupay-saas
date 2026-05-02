import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore";

interface RoleRouteProps {
  allowedRole: "STUDENT" | "ADMIN" | "SUPERADMIN";
}

export default function RoleRoute({ allowedRole }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol del usuario no es el que permite esta ruta, lo redirigimos a su zona
  if (user.role !== allowedRole) {
    return (
      <Navigate to={user.role === "ADMIN" ? "/admin" : "/student"} replace />
    );
  }

  return <Outlet />;
}
