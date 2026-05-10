import { useEffect, useState } from "react";
import {
  getMyTenantInfo,
  updateMyTenant,
  type MyTenant as MyTenantType,
} from "../../services/tenant";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function MyTenant() {
  const [tenant, setTenant] = useState<MyTenantType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para el formulario controlados localmente para mayor agilidad
  const [domain, setDomain] = useState("");
  const [interestRate, setInterestRate] = useState<number>(0);

  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const data = await getMyTenantInfo();
        setTenant(data);
        setDomain(data.domain);
        setInterestRate(data.default_interest_rate);
      } catch (error) {
        addNotification(
          "Error",
          "No se pudo cargar la información de la universidad.",
          "warning",
        );
        sileo.error({
          title: "Error",
          description: "No se pudo cargar la información de la universidad.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, [addNotification]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateMyTenant({
        domain,
        default_interest_rate: interestRate,
      });
      addNotification(
        "Actualizado",
        "Configuración de la universidad guardada con éxito.",
        "success",
      );
      sileo.success({
        title: "Actualizado",
        description: "Configuración de la universidad guardada con éxito.",
      });
    } catch (error) {
      addNotification(
        "Error",
        "Fallo al actualizar la configuración.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "Fallo al actualizar la configuración.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-foreground animate-pulse font-bold text-xl">
        Cargando configuración...
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
          Configuración de {tenant.name}
        </h1>
        <p className="text-foreground text-sm mt-1">
          Gestiona los parámetros globales y visualiza el estado actual de la
          institución.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PANEL DE INFORMACIÓN DE SOLO LECTURA */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-surface p-5 rounded-xl border border-line shadow-sm">
            <h3 className="text-sm font-bold text-foreground uppercase mb-4">
              Detalles del Sistema
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted font-semibold uppercase">
                  ID de Inquilino
                </p>
                <p className="text-xs font-mono text-foreground mt-1 bg-background p-2 rounded border border-line break-all">
                  {tenant.id}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted font-semibold uppercase">
                  Estado Operativo
                </p>
                <p
                  className={`text-sm font-bold flex items-center gap-2 mt-1 ${tenant.is_active ? "text-success" : "text-danger"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${tenant.is_active ? "bg-success" : "bg-danger"}`}
                  ></span>
                  {tenant.is_active ? "Servicio Activo" : "Servicio Suspendido"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted font-semibold uppercase">
                  Fecha de Registro
                </p>
                <p className="text-sm text-foreground mt-1">
                  {new Date(tenant.created_at).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULARIO DE ACTUALIZACIÓN */}
        <div className="md:col-span-2">
          <form
            onSubmit={handleUpdate}
            className="bg-surface p-6 rounded-xl border border-line shadow-sm space-y-5"
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              Parámetros Modificables
            </h3>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Dominio Institucional
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-background border border-line rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="ejemplo.edu.co"
                required
              />
              <p className="text-xs text-muted mt-1">
                Utilizado para validaciones y notificaciones del sistema.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Tasa de Interés Diaria de Mora (Decimal)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full bg-background border border-line rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
                required
              />
              <p className="text-xs text-muted mt-1">
                Define el porcentaje de recargo diario para deudas vencidas. Ej:
                0.0015 = 0.15%
              </p>
            </div>

            <div className="pt-4 border-t border-line">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-background font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Guardando cambios..." : "Guardar Configuración"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
