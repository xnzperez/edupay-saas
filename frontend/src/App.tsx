import { BrowserRouter, Routes, Route, Navigate } from "react-router";
// Asumiendo que Sileo requiere un componente Toaster/Provider en la raíz
// Ajusta esta importación según la documentación exacta de Sileo si es diferente
import { Toaster } from "sileo";
import Login from "./pages/Login";

export default function App() {
  return (
    // 1. BrowserRouter: Es el motor que escucha los cambios en la URL del navegador
    // sin tener que recargar la página completa.
    <BrowserRouter>
      {/* 2. Toaster de Sileo: Lo colocamos fuera de las <Routes> pero dentro del Router. 
          Al estar aquí en la raíz, nos aseguramos de que las alertas puedan dispararse 
          y verse sin importar en qué página estemos navegando. */}
      <Toaster />

      {/* 3. Routes: Actúa como un Switch. Analiza la URL actual y renderiza 
          ÚNICAMENTE el componente <Route> que coincida. */}
      <Routes>
        {/* Ruta comodín: Si el usuario entra a la raíz ("/") de la app, 
            lo redirigimos automáticamente a "/login" usando el componente Navigate. 
            El prop "replace" borra el historial para que el botón de "Atrás" no lo regrese a la raíz vacía. */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Ruta de Autenticación: Renderiza nuestro formulario con la paleta Nord */}
        <Route path="/login" element={<Login />} />

        {/* TODO: Más adelante agregaremos aquí las rutas protegidas.
          Ejemplo: <Route path="/dashboard" element={<Dashboard />} /> 
        */}
      </Routes>
    </BrowserRouter>
  );
}
