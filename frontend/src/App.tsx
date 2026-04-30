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
import StudentsList from "./pages/admin/Students";
import BillingList from "./pages/admin/Billing";

// Importamos la nueva vista de SuperAdmin
import CreateTenant from "./pages/superadmin/CreateTenant";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ========================================== */}
        {/* RUTA DE SUPERADMIN (Gestor del SaaS) */}
        {/* ========================================== */}
        <Route path="/superadmin/tenants/new" element={<CreateTenant />} />

        {/* 1. Guardia de Puerta Principal (Solo logueados) */}
        <Route element={<ProtectedRoute />}>
          {/* 2A. Guardia de Cajeros */}
          <Route element={<RoleRoute allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="billing" element={<BillingList />} />
            </Route>
          </Route>

          {/* 2B. Guardia de Estudiantes */}
          <Route element={<RoleRoute allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="store" element={<Store />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
