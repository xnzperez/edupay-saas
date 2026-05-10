import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store/authStore"; // IMPORTACIÓN CORREGIDA

export default function MasterRouteGuard() {
  const user = useAuthStore((state) => state.user);
  const MASTER_TENANT_ID = import.meta.env.VITE_MASTER_TENANT_ID;

  // LOGS DE AUDITORÍA (Abre la consola del navegador F12 para verlos)
  console.log("=== MASTER ROUTE GUARD ===");
  console.log("1. Tenant ID del Usuario:", user?.tenant_id);
  console.log("2. Tenant ID del Entorno (.env):", MASTER_TENANT_ID);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.tenant_id !== MASTER_TENANT_ID) {
    console.warn("BLOQUEADO: El ID no coincide con el Maestro.");
    return <Navigate to="/superadmin/my-tenant" replace />;
  }

  console.log("ACCESO CONCEDIDO AL MAESTRO");
  return <Outlet />;
}
