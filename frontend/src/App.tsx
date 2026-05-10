import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";
import { useThemeStore } from "./store/themeStore"; // <-- IMPORTANTE: Importar el store

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

export default function App() {
  // EXTRAEMOS EL TEMA: Esto hace que App.tsx se re-renderice al cambiar el tema
  const theme = useThemeStore((state) => state.theme);

  return (
    <BrowserRouter>
      {/* --- CONFIGURACIÓN GLOBAL "PREMIUM DARK" PARA SILEO --- */}
      <Toaster
        position="top-center"
        theme="dark" // Forzamos el tema oscuro para las notificaciones
        options={{
          fill: "#0f172a", // Usamos tu azul slate-900 profundo de fondo
          roundness: 16,
          styles: {
            // Forzamos blanco puro (!) para que resalte en cualquier tema
            title: "text-white! font-bold!",
            description: "text-white/70! font-medium!",
            badge: "bg-white/10!", // Circulito del icono traslúcido
            button:
              "bg-primary/20! hover:bg-primary/30! text-primary! font-bold!",
          },
        }}
        className="z-[9999]"
      />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ... Resto de tus rutas ... */}
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
              <Route index element={<Navigate to="tenants" replace />} />
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
