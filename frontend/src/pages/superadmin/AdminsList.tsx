import { useEffect, useState } from "react";
import {
  getLocalAdmins,
  createLocalAdmin,
  updateLocalAdminStatus,
  type LocalAdmin,
} from "../../services/localAdmin";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function AdminsList() {
  const [admins, setAdmins] = useState<LocalAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario para nuevo cajero
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const addNotification = useNotificationStore((s) => s.addNotification);

  const fetchAdmins = async () => {
    try {
      const data = await getLocalAdmins();
      setAdmins(data);
    } catch (error) {
      addNotification(
        "Error",
        "No se pudo obtener la lista de cajeros.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "No se pudo obtener la lista de cajeros.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createLocalAdmin(formData);
      addNotification("Éxito", "Cajero registrado correctamente.", "success");
      sileo.success({ title: "Éxito", description: "Cajero registrado correctamente." });
      setIsModalOpen(false);
      setFormData({ full_name: "", email: "", password: "" });
      fetchAdmins();
    } catch (error) {
      addNotification(
        "Error",
        "El correo ya está registrado o los datos son inválidos.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "El correo ya está registrado o los datos son inválidos.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateLocalAdminStatus(id, !currentStatus);
      addNotification(
        "Actualizado",
        `Cajero ${!currentStatus ? "activado" : "suspendido"}.`,
        "success",
      );
      sileo.success({
        title: "Actualizado",
        description: `Cajero ${!currentStatus ? "activado" : "suspendido"}.`,
      });
      fetchAdmins();
    } catch (error) {
      addNotification("Error", "No se pudo cambiar el estado.", "warning");
      sileo.error({ title: "Error", description: "No se pudo cambiar el estado." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Gestión de Personal Administrativo
          </h1>
          <p className="text-foreground text-sm mt-1">
            Administra los cajeros y personal con acceso al sistema de tu
            universidad.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:-translate-y-0.5 shadow-md"
        >
          + Nuevo Cajero
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-line shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-background border-b border-line">
            <tr>
              <th className="p-4 text-xs font-bold text-muted uppercase">
                Nombre Completo
              </th>
              <th className="p-4 text-xs font-bold text-muted uppercase">
                Correo Institucional
              </th>
              <th className="p-4 text-xs font-bold text-muted uppercase text-center">
                Estado
              </th>
              <th className="p-4 text-xs font-bold text-muted uppercase text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-4">
                    <div className="space-y-3">
                      <div className="h-10 bg-surface border border-line rounded-xl animate-pulse"></div>
                      <div className="h-10 bg-surface border border-line rounded-xl animate-pulse"></div>
                    </div>
                  </td>
                </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-foreground italic">
                  No hay cajeros registrados aún.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="hover:bg-background transition-colors"
                >
                  <td className="p-4 text-foreground font-medium">
                    {admin.full_name}
                  </td>
                  <td className="p-4 text-foreground font-mono text-sm">
                    {admin.email}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${admin.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                    >
                      {admin.is_active ? "ACTIVO" : "SUSPENDIDO"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleStatus(admin.id, admin.is_active)}
                      className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${admin.is_active ? "border-danger text-danger hover:bg-danger hover:text-foreground" : "border-success text-success hover:bg-success hover:text-background"}`}
                    >
                      {admin.is_active ? "Suspender" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA CREACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-surface w-full max-w-md rounded-2xl border border-line shadow-2xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground">
              Registrar Nuevo Personal
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre completo"
                required
                className="w-full px-4 py-3 bg-background border border-line rounded-xl text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email institucional"
                required
                className="w-full px-4 py-3 bg-background border border-line rounded-xl text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Contraseña temporal"
                required
                className="w-full px-4 py-3 bg-background border border-line rounded-xl text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 text-muted hover:text-foreground font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5 shadow-md"
              >
                {isSaving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
