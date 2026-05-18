import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";
import { useThemeStore } from "./store/themeStore";
import { useAuthStore } from "./store/authStore"; // <-- NUEVO IMPORT

import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRole from "./components/RoleRoute";

// Componentes del Estudiante
import StudentLayout from "./components/layouts/StudentLayout";
import Dashboard from "./pages/student/Dashboard";
import Transfer from "./pages/student/Transfer";
import Store from "./pages/student/Store";

// Componentes del Admin (Cajero)
import AdminLayout from "./components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import DebtsList from "./pages/admin/DebtsList";
import Deposit from "./pages/admin/Deposit";
import BillingList from "./pages/admin/Billing";
import Transactions from "./pages/admin/Transactions";
import StudentsList from "./pages/admin/StudentsList";

// Componentes del SuperAdmin (SaaS Owner & Local SuperAdmin)
import SuperAdminLayout from "./components/layouts/SuperAdminLayout";
import MasterRouteGuard from "./router/MasterRouteGuard";
import CreateTenant from "./pages/superadmin/CreateTenant";
import TenantsList from "./pages/superadmin/TenantsList";
import MyTenant from "./pages/superadmin/MyTenant";
import AdminsList from "./pages/superadmin/AdminsList";

// --- ENRUTADOR INTELIGENTE DE ÍNDICE ---
// Este componente evalúa la identidad antes de decidir a dónde redirigir en "/superadmin"
const SuperAdminIndexRedirect = () => {
  const user = useAuthStore((state) => state.user);
  const MASTER_ID = import.meta.env.VITE_MASTER_TENANT_ID;

  if (user?.tenant_id === MASTER_ID) {
    return <Navigate to="tenants" replace />;
  }
  return <Navigate to="my-tenant" replace />;
};

export default function App() {
  const theme = useThemeStore((state) => state.theme);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        theme={theme}
        options={{
          roundness: 16,
          styles: {
            title: "font-bold!",
            description: "font-medium opacity-80!",
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRole allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="store" element={<Store />} />
            </Route>
          </Route>

          <Route element={<RoleRole allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="deposit" element={<Deposit />} />
              <Route path="billing" element={<BillingList />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="debts" element={<DebtsList />} />
            </Route>
          </Route>

          <Route element={<RoleRole allowedRole="SUPERADMIN" />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              {/* 2. CORRECCIÓN: Usamos el interceptor en lugar de una redirección ciega */}
              <Route index element={<SuperAdminIndexRedirect />} />

              <Route element={<MasterRouteGuard />}>
                <Route path="tenants" element={<TenantsList />} />
                <Route path="create-tenant" element={<CreateTenant />} />
              </Route>
              <Route path="my-tenant" element={<MyTenant />} />
              <Route path="admins" element={<AdminsList />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
