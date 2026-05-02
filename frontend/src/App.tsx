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

// Importamos las vistas del Dueño del SaaS
import SuperAdminLayout from "./components/layouts/SuperAdminLayout";
import CreateTenant from "./pages/superadmin/CreateTenant";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" theme="dark" className="z-[9999]" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* 1. Guardia de Puerta Principal (Asegura que exista un JWT válido) */}
        <Route element={<ProtectedRoute />}>
          {/* 2A. Guardia de Estudiantes */}
          <Route element={<RoleRoute allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="store" element={<Store />} />
            </Route>
          </Route>

          {/* 2B. Guardia de Cajeros (Administradores de Universidad) */}
          <Route element={<RoleRoute allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="billing" element={<BillingList />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="debts" element={<DebtsList />} />
            </Route>
          </Route>

          {/* 2C. Guardia del Dueño del SaaS (Super Administrador) */}
          <Route element={<RoleRoute allowedRole="SUPERADMIN" />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              {/* El index redirige al formulario por defecto */}
              <Route index element={<Navigate to="create-tenant" replace />} />
              <Route path="create-tenant" element={<CreateTenant />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
