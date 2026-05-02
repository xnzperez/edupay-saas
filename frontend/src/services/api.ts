import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { sileo } from "sileo";

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

    // Buscar "token" exactamente como lo guarda Zustand
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
  (response) => response, // Si todo sale bien, deja pasar la data al componente
  (error) => {
    // 1. Manejo Crítico: Sesión expirada (401)
    if (error.response?.status === 401) {
      console.warn(
        "🔒 API: Token inválido, expirado o ausente. Limpiando sesión...",
      );
      useAuthStore.getState().logout();
      window.location.href = "/login";

      // Retornamos inmediatamente para no disparar notificaciones extrañas al usuario
      return Promise.reject(error);
    }

    // 2. Manejo Global de Errores con Sileo (400, 403, 404, 500...)
    if (error.response) {
      // Extraemos el mensaje unificado que seteamos en Go con Antigravity
      const serverMessage =
        error.response.data?.message || error.response.data?.error;
      const fallbackMessage =
        "Ocurrió un error en el servidor. Inténtalo más tarde.";

      sileo.error({
        title: "Operación rechazada",
        description: serverMessage || fallbackMessage,
        // TODO (Theme): Cuando implementemos el selector Light/Dark,
        // pasaremos el tema aquí leyendo directamente del DOM o localStorage:
        // theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      });
    } else if (error.request) {
      // 3. Manejo de caída de red (El servidor de Go está apagado o no hay internet)
      sileo.error({
        title: "Error de Conexión",
        description: "No se pudo conectar con el servidor central.",
      });
    }

    // Devolvemos el error al componente por si necesita hacer algo localmente (ej. apagar un spinner)
    return Promise.reject(error);
  },
);
