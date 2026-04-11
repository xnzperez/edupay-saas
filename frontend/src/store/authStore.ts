import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

// Definimos qué trae tu token por dentro
interface JwtPayload {
  sub: string; // El ID del usuario
  role: string; // ADMIN o STUDENT
  tenant_id: string; // El ID de la UCC
  exp: number;
}

interface AuthState {
  token: string | null;
  user: JwtPayload | null;
  setToken: (token: string) => void;
  logout: () => void;
}

// Función auxiliar para leer el token de inicio si recargas la página
const getInitialUser = () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }
  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  user: getInitialUser(), // Extrae los datos al instante

  setToken: (token: string) => {
    localStorage.setItem("token", token);
    const decodedUser = jwtDecode<JwtPayload>(token); // Abrimos el token
    set({ token, user: decodedUser }); // Guardamos ambas cosas
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
}));
