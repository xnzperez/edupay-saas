import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";

// 1. Importamos la vista de Login
import Login from "./pages/auth/Login";

// 2. Importamos los Guardias de Seguridad
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

// 3. Importamos los Layouts
import StudentLayout from "./components/layouts/StudentLayout";

// 4. Importamos las Páginas del Estudiante
import Dashboard from "./pages/student/Dashboard";
import Transfer from "./pages/student/Transfer";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- ZONAS PROTEGIDAS POR TOKEN --- */}
        <Route element={<ProtectedRoute />}>
          {/* --- MUNDO CAJERO (Temporalmente vacío hasta que lo creemos) --- */}
          <Route element={<RoleRoute allowedRole="ADMIN" />}>
            <Route
              path="/admin"
              element={<div>Layout del Cajero en construcción...</div>}
            >
              {/* Aquí irán las rutas del cajero */}
            </Route>
          </Route>

          {/* --- MUNDO ESTUDIANTE --- */}
          <Route element={<RoleRoute allowedRole="STUDENT" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="transfer" element={<Transfer />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
