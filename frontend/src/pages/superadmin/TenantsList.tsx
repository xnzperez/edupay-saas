import { useEffect, useState } from "react";
import {
  getTenants,
  updateTenantStatus,
  type Tenant,
} from "../../services/tenant";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function TenantsList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const addNotification = useNotificationStore((s) => s.addNotification);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async () => {
    if (!selectedTenant) return;
    setIsToggling(true);

    try {
      const newStatus = !selectedTenant.is_active;
      await updateTenantStatus(selectedTenant.id, newStatus);

      // Actualizamos el modal y la tabla en tiempo real
      const updatedTenant = { ...selectedTenant, is_active: newStatus };
      setSelectedTenant(updatedTenant);
      setTenants(
        tenants.map((t) => (t.id === updatedTenant.id ? updatedTenant : t)),
      );

      // Disparamos la notificación gerencial
      addNotification(
        "Estado Actualizado",
        `La ${updatedTenant.name} ha sido ${newStatus ? "activada" : "suspendida"} exitosamente.`,
        newStatus ? "success" : "warning",
      );
      sileo.success({
        title: "Estado Actualizado",
        description: `La ${updatedTenant.name} ha sido ${newStatus ? "activada" : "suspendida"} exitosamente.`,
      });
    } catch (error) {
      addNotification(
        "Error",
        "No se pudo actualizar el estado de la universidad.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "No se pudo actualizar el estado de la universidad.",
      });
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await getTenants();
        setTenants(data);
      } catch (error) {
        console.error("Error fetching tenants:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  // Filtro en tiempo real
  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Gestión de Universidades
          </h1>
          <p className="text-foreground text-sm mt-1">
            Visualiza y administra los inquilinos registrados en la plataforma.
          </p>
        </div>
      </div>

      {/* --- BARRA DE BÚSQUEDA --- */}
      <div className="bg-surface p-4 rounded-xl border border-line shadow-sm flex items-center gap-3">
        <svg
          className="w-5 h-5 text-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar universidad por nombre..."
          className="bg-transparent border-none outline-none text-foreground w-full font-medium placeholder-muted"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- TABLA DE DATOS REAL --- */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-line/50 border-b border-line text-foreground text-sm uppercase tracking-wider">
                <th className="p-4 font-bold">ID del Inquilino</th>
                <th className="p-4 font-bold">Universidad</th>
                <th className="p-4 font-bold">Fecha de Registro</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-foreground font-bold animate-pulse"
                  >
                    Cargando información desde el servidor...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted font-bold"
                  >
                    No se encontraron universidades.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-line/30 transition-colors group"
                  >
                    <td className="p-4 text-xs font-mono text-muted group-hover:text-foreground transition-colors">
                      {tenant.id}
                    </td>
                    <td className="p-4 font-bold text-foreground">{tenant.name}</td>
                    <td className="p-4 text-sm text-foreground">
                      {new Date(tenant.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="text-primary hover:text-primary-hover text-sm font-bold px-3 py-1 rounded border border-primary/30 hover:border-primary transition-all"
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE DETALLES DEL INQUILINO --- */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-background border border-line rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="p-6 border-b border-line flex justify-between items-start bg-surface">
              <div>
                <h3 className="text-xl font-bold text-primary">
                  {selectedTenant.name}
                </h3>
                <p className="text-xs text-foreground font-mono mt-1 mt-1">
                  ID: {selectedTenant.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="text-foreground hover:text-danger transition-colors p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Cuerpo del Modal (Con datos reales y dinámicos) */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-3 rounded-lg border border-line">
                  <p className="text-xs font-bold text-foreground uppercase">
                    Estado Operativo
                  </p>
                  <p
                    className={`text-sm font-bold flex items-center gap-2 mt-1 ${selectedTenant.is_active ? "text-success" : "text-danger"}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${selectedTenant.is_active ? "bg-success animate-pulse" : "bg-danger"}`}
                    ></span>
                    {selectedTenant.is_active ? "Activo" : "Suspendido"}
                  </p>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-line">
                  <p className="text-xs font-bold text-foreground uppercase">
                    Plan SaaS
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">
                    Enterprise
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground uppercase mb-1">
                  Fecha de Alta
                </p>
                <p className="text-sm text-foreground">
                  {new Date(selectedTenant.created_at).toLocaleString("es-CO")}
                </p>
              </div>

              {/* BOTÓN REAL DE SUSPENSIÓN/ACTIVACIÓN */}
              <button
                onClick={handleToggleStatus}
                disabled={isToggling}
                className={`w-full mt-4 font-bold py-2 px-4 rounded-lg border transition-all flex items-center justify-center gap-2 shadow-md ${
                  selectedTenant.is_active
                    ? "bg-danger/10 text-danger border-danger hover:bg-danger hover:text-background"
                    : "bg-success/10 text-success border-success hover:bg-success hover:text-background"
                } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isToggling ? (
                  "Procesando orden..."
                ) : selectedTenant.is_active ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    Suspender Universidad
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Reactivar Universidad
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
