import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { loginUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { loginSchema, type LoginFormValues } from "../../validations/auth";

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  // EXTRAEMOS AL USUARIO DE ZUSTAND
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);

  // --- EL VIGILANTE DE LA PUERTA ---
  useEffect(() => {
    // Si ya hay un usuario logueado, lo sacamos del login automáticamente
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
    }
  }, [user, navigate]);
  // ------------------------------------------

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await loginUser(data);
      setToken(response.token);

      sileo.success({
        title: "¡Acceso concedido!",
        description: response.message,
      });

      const role = useAuthStore.getState().user?.role;
      if (role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
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
    <div className="flex min-h-screen bg-nord-0 font-sans">
      {/* --- LADO IZQUIERDO: Branding y Marketing (Oculto en celulares) --- */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-nord-8 to-nord-10 flex-col justify-between p-16 text-nord-0 relative overflow-hidden">
        {/* Círculos decorativos de fondo para darle toque premium */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-black opacity-10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold tracking-tight">EduPay</h1>
          <p className="mt-6 text-xl font-medium opacity-90 leading-relaxed max-w-md">
            El motor financiero inteligente. Gestiona pagos, transacciones y
            deudas con precisión milimétrica.
          </p>
        </div>

        {/* Tarjeta Glassmorphism (Cristal) para presumir la arquitectura */}
        <div className="relative z-10 space-y-6">
          <div className="p-8 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
            <p className="text-lg font-semibold leading-relaxed">
              "La seguridad no es una opción, es el núcleo. EduPay aísla los
              datos a nivel de motor de base de datos."
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-10 h-10 bg-nord-0 rounded-full flex items-center justify-center">
                <span className="text-nord-8 font-bold">✓</span>
              </div>
              <div>
                <p className="text-sm font-bold opacity-90">
                  Arquitectura Multi-Tenant
                </p>
                <p className="text-xs opacity-75">Azure Cloud Services</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LADO DERECHO: Formulario de Autenticación --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-nord-6">
              Bienvenido al sistema
            </h2>
            <p className="mt-3 text-sm text-nord-4">
              Ingresa tus credenciales institucionales para acceder a tu panel
              de control.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-8">
            {/* Input Correo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-nord-4 tracking-wide">
                CORREO INSTITUCIONAL
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register("email")}
                  placeholder="usuario@campusucc.edu.co"
                  className={`w-full px-4 py-3.5 bg-nord-1 border rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:outline-none transition-all duration-200 ${
                    errors.email
                      ? "border-nord-11 focus:ring-nord-11/20"
                      : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-nord-11 text-xs font-semibold animate-pulse">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Input Contraseña */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-nord-4 tracking-wide">
                  CONTRASEÑA
                </label>
                <a
                  href="#"
                  className="text-xs font-semibold text-nord-8 hover:text-nord-9 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3.5 bg-nord-1 border rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:outline-none transition-all duration-200 ${
                    errors.password
                      ? "border-nord-11 focus:ring-nord-11/20"
                      : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-nord-11 text-xs font-semibold animate-pulse">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Botón Submit con Spinner de carga */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-extrabold text-nord-0 bg-nord-8 hover:bg-nord-9 focus:outline-none focus:ring-4 focus:ring-nord-8/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-nord-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Estableciendo conexión segura...
                </span>
              ) : (
                "INICIAR SESIÓN"
              )}
            </button>
          </form>

          {/* Microcopy corporativo para impresionar jurados */}
          <div className="pt-8 mt-8 border-t border-nord-2/50">
            <p className="text-center text-xs text-nord-3 font-medium">
              Protegido por políticas de Row-Level Security (RLS). <br />
              Toda comunicación viaja encriptada mediante TLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
