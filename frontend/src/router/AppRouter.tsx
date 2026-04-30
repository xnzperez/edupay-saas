import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./PrivateRoute";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={<div>Pantalla de Login (Próximamente)</div>}
        />

        {/* Rutas Privadas (Protegidas) */}
        <Route element={<PrivateRoute />}>
          <Route
            path="/dashboard"
            element={<div>Dashboard del Estudiante (Próximamente)</div>}
          />
          <Route
            path="/store"
            element={<div>Tienda de Certificados (Próximamente)</div>}
          />
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
