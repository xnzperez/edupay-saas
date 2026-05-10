import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";

import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

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
  return (
    <BrowserRouter>
      <Toaster position="top-center" theme="dark" className="z-[9999]" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ==========================================
            BARRERA PRINCIPAL (Requiere JWT)
            ========================================== */}
        <Route element={<ProtectedRoute />}>
          {/* ==========================================
              1. RUTAS DE ESTUDIANTE (Usuario Final)
              ========================================== */}
          <Route element={<RoleRoute allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="store" element={<Store />} />
            </Route>
          </Route>

          {/* ==========================================
              2. RUTAS DE ADMINISTRADOR (Cajeros de Universidad)
              ========================================== */}
          <Route element={<RoleRoute allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="deposit" element={<Deposit />} />
              <Route path="billing" element={<BillingList />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="debts" element={<DebtsList />} />
            </Route>
          </Route>

          {/* ==========================================
              3. RUTAS DE SUPERADMIN (Maestro y Locales)
              ========================================== */}
          <Route element={<RoleRoute allowedRole="SUPERADMIN" />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<Navigate to="tenants" replace />} />

              {/* 3A. Rutas exclusivas del SaaS Owner (Root) */}
              <Route element={<MasterRouteGuard />}>
                <Route path="tenants" element={<TenantsList />} />
                <Route path="create-tenant" element={<CreateTenant />} />
              </Route>

              {/* 3B. Rutas compartidas (Locales y Root) */}
              <Route path="my-tenant" element={<MyTenant />} />
              <Route path="admins" element={<AdminsList />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
