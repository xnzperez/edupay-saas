import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: string;
  role: string;
  tenant_id: string;
  exp: number;
}

interface AuthState {
  token: string | null;
  user: JwtPayload | null;
  setToken: (token: string) => void;
  logout: () => void;
}

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
  user: getInitialUser(),

  setToken: (token: string) => {
    localStorage.setItem("token", token);
    try {
      const decodedUser = jwtDecode<JwtPayload>(token);
      set({ token, user: decodedUser });
    } catch (e) {
      // Si el token es inválido, abortamos y limpiamos por seguridad
      localStorage.removeItem("token");
      set({ token: null, user: null });
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
}));
