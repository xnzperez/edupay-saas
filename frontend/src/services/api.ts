import axios from "axios";

// Instancia base conectada al backend de Go
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Se ejecuta ANTES de que cualquier petición salga hacia Go
api.interceptors.request.use(
  (config) => {
    // Inyectar el Tenant ID (La universidad)
    const tenantId = import.meta.env.VITE_TENANT_ID;
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }

    // Inyectar el Token JWT si el usuario ya inició sesión
    const token = localStorage.getItem("jwt_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
