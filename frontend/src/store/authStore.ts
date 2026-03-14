import { create } from "zustand";

// 1. Definimos la estructura de nuestro estado global
interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

// 2. Creamos el hook personalizado que usaremos en nuestros componentes
export const useAuthStore = create<AuthState>((set) => ({
  // Al inicializar, leemos el localStorage por si el usuario recarga la página web (F5)
  token: localStorage.getItem("jwt_token"),

  // Acción para iniciar sesión: guarda el token en memoria y en disco
  setToken: (token: string) => {
    localStorage.setItem("jwt_token", token);
    set({ token });
  },

  // Acción para cerrar sesión: limpia la memoria y el disco
  logout: () => {
    localStorage.removeItem("jwt_token");
    set({ token: null });
  },
}));
