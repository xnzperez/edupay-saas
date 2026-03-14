import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sileo";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transfer from "./pages/Transfer";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout"; // <-- Importamos el Layout

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- ZONA PROTEGIDA --- */}
        <Route element={<ProtectedRoute />}>
          {/* Todas las rutas dentro de este Route tendrán el Navbar arriba */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transfer" element={<Transfer />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
