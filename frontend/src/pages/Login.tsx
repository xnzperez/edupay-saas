import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { loginUser } from "../services/auth";
import { useAuthStore } from "../store/authStore";
import { loginSchema, type LoginFormValues } from "../validations/auth";

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializamos React Hook Form conectado a Zod
  const {
    register, // Conecta los inputs al estado del formulario
    handleSubmit, // Intercepta el evento submit y ejecuta la validación
    formState: { errors }, // Contiene los errores generados por Zod
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Esta función SOLO se ejecutará si Zod aprueba que los datos son válidos
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      // Ahora enviamos data.email y data.password de forma segura
      const response = await loginUser(data);

      setToken(response.token);
      sileo.success({
        title: "¡Acceso concedido!",
        description: response.message,
      });
      navigate("/dashboard");
    } catch (error: any) {
      sileo.error({
        title: "Error de autenticación",
        description: error.response?.data?.error || "Credenciales incorrectas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nord-0 p-4">
      <div className="w-full max-w-md bg-nord-1 rounded-xl shadow-lg p-8 border border-nord-2">
        <h1 className="text-3xl font-bold text-nord-8 text-center mb-6">
          EduPay
        </h1>

        {/* Pasamos nuestra función onSubmit a través del handleSubmit de RHF */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Correo Institucional
            </label>
            <input
              type="email"
              // Reemplazamos value y onChange por el registro de RHF
              {...register("email")}
              className={`w-full bg-nord-0 border text-nord-6 rounded-lg p-3 focus:outline-none transition-colors ${
                errors.email
                  ? "border-nord-11 focus:border-nord-11"
                  : "border-nord-3 focus:border-nord-8"
              }`}
              placeholder="isaac@campusucc.edu.co"
            />
            {/* Mensaje de error dinámico de Zod */}
            {errors.email && (
              <p className="text-nord-11 text-xs mt-1 font-medium">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              {...register("password")}
              className={`w-full bg-nord-0 border text-nord-6 rounded-lg p-3 focus:outline-none transition-colors ${
                errors.password
                  ? "border-nord-11 focus:border-nord-11"
                  : "border-nord-3 focus:border-nord-8"
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-nord-11 text-xs mt-1 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-nord-8 hover:bg-nord-10 text-nord-0 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Conectando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
