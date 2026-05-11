import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore"; // IMPORTACIÓN CORREGIDA

export default function MasterRouteGuard() {
  const user = useAuthStore((state) => state.user);
  const MASTER_TENANT_ID = import.meta.env.VITE_MASTER_TENANT_ID;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validación silenciosa, sin logs
  if (user.tenant_id !== MASTER_TENANT_ID) {
    return <Navigate to="/superadmin/tenants" replace />;
  }

  return <Outlet />;
}
