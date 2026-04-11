import axios from "axios";
import { useAuthStore } from "../store/authStore"; // Importamos el store

// Instancia base conectada al backend de Go
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- INTERCEPTOR DE PETICIÓN (De salida) ---
api.interceptors.request.use(
  (config) => {
    // Inyectar el Tenant ID (La universidad)
    const tenantId = import.meta.env.VITE_TENANT_ID;
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }

    // ¡CORRECCIÓN CRÍTICA!: Ahora busca "token", exactamente como lo guarda Zustand
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- INTERCEPTOR DE RESPUESTA (De entrada) ---
api.interceptors.response.use(
  (response) => response, // Si todo sale bien, deja pasar la data
  (error) => {
    // Si Go nos responde con un 401 (No Autorizado)
    if (error.response?.status === 401) {
      console.warn(
        "🔒 API: Token inválido, expirado o ausente. Limpiando sesión...",
      );

      // 1. Ejecutamos el logout de Zustand (esto borra el "token" del localStorage)
      useAuthStore.getState().logout();

      // 2. Mandamos al usuario al login forzosamente rompiendo el ciclo de React Router
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
