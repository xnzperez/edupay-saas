import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";

import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import StudentLayout from "./components/layouts/StudentLayout";
import Dashboard from "./pages/student/Dashboard";
import Transfer from "./pages/student/Transfer";
import Store from "./pages/student/Store";

import AdminLayout from "./components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import DebtsList from "./pages/admin/DebtsList";
import StudentsList from "./pages/admin/Students";
import BillingList from "./pages/admin/Billing";
import Transactions from "./pages/admin/Transactions";

// Import SaaS Owner & Local SuperAdmin views
import SuperAdminLayout from "./components/layouts/SuperAdminLayout";
import MasterRouteGuard from "./router/MasterRouteGuard";
import CreateTenant from "./pages/superadmin/CreateTenant";
import TenantsList from "./pages/superadmin/TenantsList";
import MyTenant from "./pages/superadmin/MyTenant";
import AdminsList from "./pages/superadmin/AdminsList"; // IMPORTACIÓN REAL

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" theme="dark" className="z-[9999]" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="store" element={<Store />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="billing" element={<BillingList />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="debts" element={<DebtsList />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRole="SUPERADMIN" />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<Navigate to="tenants" replace />} />

              <Route element={<MasterRouteGuard />}>
                <Route path="tenants" element={<TenantsList />} />
                <Route path="create-tenant" element={<CreateTenant />} />
              </Route>

              {/* RUTAS DEL SUPERADMIN LOCAL */}
              <Route path="my-tenant" element={<MyTenant />} />
              {/* Hemos corregido la ruta aquí: de "students" a "admins" */}
              <Route path="admins" element={<AdminsList />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
