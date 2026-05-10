import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { loginUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { loginSchema, type LoginFormValues } from "../../validations/auth";

// Definimos el array de imágenes estáticas
const CAROUSEL_IMAGES = [
  "/modern-university.avif",
  "/data-center-abstract.avif",
  "/fintech.avif",
];

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- LÓGICA DEL CARRUSEL ---
  useEffect(() => {
    // Cambia la imagen cada 5 segundos
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % CAROUSEL_IMAGES.length,
      );
    }, 5000);

    return () => clearInterval(interval); // Cleanup para evitar fugas de memoria
  }, []);

  // --- EL VIGILANTE DE LA PUERTA ---
  useEffect(() => {
    if (user) {
      if (user.role === "SUPERADMIN")
        navigate("/superadmin/create-tenant", { replace: true });
      else if (user.role === "ADMIN") navigate("/admin", { replace: true });
      else navigate("/student", { replace: true });
    }
  }, [user, navigate]);

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
      if (role === "SUPERADMIN") navigate("/superadmin/create-tenant");
      else if (role === "ADMIN") navigate("/admin");
      else navigate("/student");
    } catch (error: any) {
      // El manejo de errores ya lo hace el interceptor o la vista
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans selection:bg-primary/30">
      {/* --- LADO IZQUIERDO: Marketing & Imagen --- */}
      <div className="hidden lg:flex w-1/2 relative bg-surface overflow-hidden border-r border-line">
        {/* Fondo de Cuadrícula */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        ></div>

        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/10 to-transparent z-0"></div>

        <div className="relative z-10 flex flex-col justify-between h-full p-16 w-full">
          {/* Header Izquierdo */}
          <div>
            <div className="inline-flex items-center gap-3 bg-surface border border-line px-4 py-2 rounded-full shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                Sistema En Línea
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              Finanzas <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover">
                Institucionales.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted font-medium max-w-md leading-relaxed">
              EduPay SaaS centraliza, automatiza y asegura cada transacción
              universitaria mediante arquitectura distribuida.
            </p>
          </div>

          {/* CONTENEDOR DEL CARRUSEL DE IMÁGENES */}
          <div className="flex-1 w-full my-8 relative rounded-2xl overflow-hidden border border-line/50 shadow-2xl bg-surface group">
            {/* Capa de oscurecimiento superpuesta para mejorar lectura si hubiera texto encima y darle toque premium */}
            <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors duration-700 z-10 mix-blend-multiply"></div>

            {CAROUSEL_IMAGES.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`EduPay Feature ${index + 1}`}
                // Optimizaciones de carga
                fetchPriority={index === 0 ? "high" : "auto"}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>

          {/* Footer Izquierdo (Glassmorphism) */}
          <div className="p-6 bg-surface/50 backdrop-blur-xl border border-line rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background rounded-xl border border-line flex items-center justify-center shadow-sm">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Aislamiento de Datos Nivel 4
                </p>
                <p className="text-xs text-muted mt-1">
                  Transacciones ACID garantizadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LADO DERECHO: Formulario (Minimalista) --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative bg-background">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Acceso al Panel
            </h2>
            <p className="text-sm text-muted">
              Ingresa tus credenciales institucionales seguras.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted tracking-wider uppercase">
                Correo Electrónico
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="usuario@campusucc.edu.co"
                className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-foreground placeholder-muted/50 focus:ring-4 focus:outline-none transition-all duration-200 ${
                  errors.email
                    ? "border-danger focus:ring-danger/20"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.email && (
                <p className="text-danger text-xs font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted tracking-wider uppercase">
                  Contraseña
                </label>
                <a
                  href="#"
                  className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-foreground placeholder-muted/50 focus:ring-4 focus:outline-none transition-all duration-200 ${
                  errors.password
                    ? "border-danger focus:ring-danger/20"
                    : "border-line focus:border-primary focus:ring-primary/20"
                }`}
              />
              {errors.password && (
                <p className="text-danger text-xs font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
            >
              {isLoading
                ? "Estableciendo conexión segura..."
                : "Iniciar Sesión Segura"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
