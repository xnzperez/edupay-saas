import { Navigate, Outlet } from "react-router";

export default function ProtectedRoute() {
  // Verificamos si existe el pase de entrada (JWT)
  const token = localStorage.getItem("jwt_token");

  // Si no hay token, abortamos la navegación y lo enviamos al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si hay token, Outlet permite que React Router renderice el componente hijo (Dashboard)
  return <Outlet />;
}
