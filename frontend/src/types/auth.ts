// src/types/auth.ts

// Exportamos la interface para que Axios y el Formulario puedan usarla
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
}
