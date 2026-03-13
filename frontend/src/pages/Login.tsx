import { useState } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "../services/auth";
// Asumiendo la API estándar de Sileo para lanzar notificaciones
import { sileo } from "sileo";

export default function Login() {
  const navigate = useNavigate();

  // Estados para capturar lo que el usuario escribe en los inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Estado para bloquear el botón mientras la petición viaja a Go
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    setIsLoading(true);

    try {
      // 1. Llamamos a nuestro servicio
      const data = await loginUser({ email, password });

      // 2. Si es exitoso, guardamos el JWT en el almacenamiento del navegador
      // Nuestro interceptor de Axios (api.ts) lo tomará de aquí automáticamente
      localStorage.setItem("jwt_token", data.token);

      // 3. Mostramos la alerta de éxito con Sileo
      sileo.success(data.message || "Bienvenido a EduPay");
      // Redirigimos al usuario a la zona segura
      navigate("/dashboard");

      // TODO: Redirigir al Dashboard (lo haremos en el siguiente paso)
    } catch (error: any) {
      // Extraemos el mensaje de error que configuramos en Go, o mostramos uno genérico
      const errorMessage =
        error.response?.data?.error || "Error al conectar con el servidor";
      sileo.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Contenedor principal centrado con fondo oscuro de la paleta Nord
    <div className="min-h-screen flex items-center justify-center bg-nord-0 p-4">
      {/* Tarjeta del formulario */}
      <div className="w-full max-w-md bg-nord-1 rounded-xl shadow-lg p-8 border border-nord-2">
        <h1 className="text-3xl font-bold text-nord-8 text-center mb-6">
          EduPay
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Correo Institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-nord-0 border border-nord-3 text-nord-6 rounded-lg p-3 focus:outline-none focus:border-nord-8 transition-colors"
              placeholder="isaac@campusucc.edu.co"
            />
          </div>

          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-nord-0 border border-nord-3 text-nord-6 rounded-lg p-3 focus:outline-none focus:border-nord-8 transition-colors"
              placeholder="••••••••"
            />
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
