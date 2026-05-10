import { useEffect, useState, useCallback } from "react";
import {
  getStudents,
  enrollStudent,
  updateStudent,
  updateStudentStatus,
  type Student,
} from "../../services/student";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Estado del formulario unificado
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const addNotification = useNotificationStore((s) => s.addNotification);

  // useCallback previene la recreación de la función en cada render
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getStudents(currentPage, limit);
      // Asumiendo que el backend retorna el PaginatedResponse que definimos
      setStudents(response.data || []);
      setTotalPages(response.total_pages || 1);
      setTotalItems(response.total || 0);
    } catch (error: unknown) {
      addNotification(
        "Error",
        "No se pudo cargar la lista de estudiantes.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "No se pudo cargar la lista de estudiantes.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, addNotification]);

  // Se dispara al montar y cuando cambian página o límite
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Manejo de cambio de límite
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
    setCurrentPage(1); // Reset a página 1 al cambiar el tamaño del lote
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedStudentId(null);
    setFormData({ full_name: "", email: "", password: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setIsEditMode(true);
    setSelectedStudentId(student.id);
    setFormData({
      full_name: student.full_name,
      email: student.email,
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEditMode && selectedStudentId) {
        await updateStudent(selectedStudentId, {
          full_name: formData.full_name,
          email: formData.email,
        });
        addNotification(
          "Actualizado",
          "Datos del estudiante modificados.",
          "success",
        );
        sileo.success({
          title: "Actualizado",
          description: "Datos del estudiante modificados.",
        });
      } else {
        await enrollStudent(formData);
        addNotification(
          "Éxito",
          "Estudiante matriculado y billetera generada.",
          "success",
        );
        sileo.success({
          title: "Éxito",
          description: "Estudiante matriculado y billetera generada.",
        });
      }
      setIsModalOpen(false);
      fetchStudents(); // Refresca la tabla actual
    } catch (error: unknown) {
      // Tipado estricto mitigando el error 'any'
      const err = error as { response?: { data?: { error?: string } } };
      const errorMsg = err.response?.data?.error || "Error en la operación.";
      addNotification("Error", errorMsg, "warning");
      sileo.error({ title: "Error", description: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateStudentStatus(id, !currentStatus);
      addNotification(
        "Estado Actualizado",
        `Estudiante ${!currentStatus ? "activo" : "suspendido"}.`,
        "success",
      );
      sileo.success({
        title: "Estado Actualizado",
        description: `Estudiante ${!currentStatus ? "activo" : "suspendido"}.`,
      });
      fetchStudents();
    } catch (error: unknown) {
      addNotification("Error", "No se pudo cambiar el estado.", "warning");
      sileo.error({
        title: "Error",
        description: "No se pudo cambiar el estado.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Matrícula de Estudiantes
          </h1>
          <p className="text-foreground text-sm mt-1">
            Gestiona los estudiantes y sus cuentas financieras. Total:{" "}
            {totalItems}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-hover text-background px-6 py-2 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
        >
          + Matricular Alumno
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-xl border border-line shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-background border-b border-line">
            <tr>
              <th className="p-4 text-xs font-bold text-muted uppercase">
                Nombre Completo
              </th>
              <th className="p-4 text-xs font-bold text-muted uppercase">
                Correo
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
                <td
                  colSpan={4}
                  className="p-10 text-center text-foreground animate-pulse font-medium"
                >
                  Cargando base de datos...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-foreground italic">
                  No hay estudiantes matriculados en esta sede.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-background transition-colors"
                >
                  <td className="p-4 text-foreground font-bold">
                    {student.full_name}
                  </td>
                  <td className="p-4 text-foreground font-mono text-sm">
                    {student.email}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${student.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                    >
                      {student.is_active ? "ACTIVO" : "SUSPENDIDO"}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(student)}
                      className="text-xs font-bold px-3 py-1 rounded border border-primary text-primary hover:bg-primary hover:text-background transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        toggleStatus(student.id, student.is_active)
                      }
                      className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${student.is_active ? "border-danger text-danger hover:bg-danger hover:text-foreground" : "border-success text-success hover:bg-success hover:text-background"}`}
                    >
                      {student.is_active ? "Suspender" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Controles de Paginación */}
        <div className="bg-background border-t border-line p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span>Mostrar:</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="bg-surface border border-line text-foreground rounded px-2 py-1 outline-none focus:border-primary transition-colors"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="text-sm font-bold text-primary disabled:text-muted disabled:cursor-not-allowed hover:text-primary-hover transition-colors"
            >
              &larr; Anterior
            </button>
            <span className="text-sm font-medium text-foreground">
              Página <span className="text-foreground">{currentPage}</span> de{" "}
              <span className="text-foreground">{totalPages}</span>
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={
                currentPage === totalPages || isLoading || totalPages === 0
              }
              className="text-sm font-bold text-primary disabled:text-muted disabled:cursor-not-allowed hover:text-primary-hover transition-colors"
            >
              Siguiente &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* MODAL UNIFICADO (CREAR/EDITAR) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-surface w-full max-w-md rounded-2xl border border-line shadow-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isEditMode ? "Editar Estudiante" : "Nueva Matrícula"}
              </h2>
              <p className="text-xs text-foreground mt-1">
                {isEditMode
                  ? "Modifica los datos de contacto."
                  : "Se creará el usuario y su billetera digital (Saldo $0)."}
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre completo"
                required
                className="w-full bg-background border border-line rounded-lg p-3 text-foreground focus:border-primary outline-none transition-colors"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Correo institucional"
                required
                className="w-full bg-background border border-line rounded-lg p-3 text-foreground focus:border-primary outline-none transition-colors"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              {!isEditMode && (
                <input
                  type="password"
                  placeholder="Contraseña temporal"
                  required
                  className="w-full bg-background border border-line rounded-lg p-3 text-foreground focus:border-primary outline-none transition-colors"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 text-foreground hover:text-foreground font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-primary text-background py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? "Procesando..."
                  : isEditMode
                    ? "Guardar Cambios"
                    : "Matricular"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
