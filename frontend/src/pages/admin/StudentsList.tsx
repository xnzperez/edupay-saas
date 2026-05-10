import { useEffect, useState } from "react";
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

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      addNotification(
        "Error",
        "No se pudo cargar la lista de estudiantes.",
        "error",
      );
      sileo.error({
        title: "Error",
        description: "No se pudo cargar la lista de estudiantes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Abrir modal para crear
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedStudentId(null);
    setFormData({ full_name: "", email: "", password: "" });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const openEditModal = (student: Student) => {
    setIsEditMode(true);
    setSelectedStudentId(student.id);
    setFormData({
      full_name: student.full_name,
      email: student.email,
      password: "",
    }); // La contraseña no se edita aquí
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
      fetchStudents();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Error en la operación.";
      addNotification("Error", errorMsg, "error");
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
        `El estudiante ahora está ${!currentStatus ? "activo" : "suspendido"}.`,
        "success",
      );
      sileo.success({
        title: "Estado Actualizado",
        description: `El estudiante ahora está ${!currentStatus ? "activo" : "suspendido"}.`,
      });
      fetchStudents();
    } catch (error) {
      addNotification("Error", "No se pudo cambiar el estado.", "error");
      sileo.error({ title: "Error", description: "No se pudo cambiar el estado." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-nord-6">
            Matrícula de Estudiantes
          </h1>
          <p className="text-nord-4 text-sm mt-1">
            Gestiona los estudiantes y sus cuentas financieras en la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-nord-8 hover:bg-nord-9 text-nord-0 px-6 py-2 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
        >
          + Matricular Alumno
        </button>
      </div>

      <div className="bg-nord-1 rounded-xl border border-nord-2 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-nord-0 border-b border-nord-2">
            <tr>
              <th className="p-4 text-xs font-bold text-nord-3 uppercase">
                Nombre Completo
              </th>
              <th className="p-4 text-xs font-bold text-nord-3 uppercase">
                Correo
              </th>
              <th className="p-4 text-xs font-bold text-nord-3 uppercase text-center">
                Estado
              </th>
              <th className="p-4 text-xs font-bold text-nord-3 uppercase text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nord-2">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-10 text-center text-nord-4 animate-pulse font-medium"
                >
                  Cargando base de datos...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-nord-4 italic">
                  No hay estudiantes matriculados en esta sede.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-nord-0 transition-colors"
                >
                  <td className="p-4 text-nord-6 font-bold">
                    {student.full_name}
                  </td>
                  <td className="p-4 text-nord-4 font-mono text-sm">
                    {student.email}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${student.is_active ? "bg-nord-14/10 text-nord-14" : "bg-nord-11/10 text-nord-11"}`}
                    >
                      {student.is_active ? "ACTIVO" : "SUSPENDIDO"}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(student)}
                      className="text-xs font-bold px-3 py-1 rounded border border-nord-8 text-nord-8 hover:bg-nord-8 hover:text-nord-0 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        toggleStatus(student.id, student.is_active)
                      }
                      className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${student.is_active ? "border-nord-11 text-nord-11 hover:bg-nord-11 hover:text-nord-6" : "border-nord-14 text-nord-14 hover:bg-nord-14 hover:text-nord-0"}`}
                    >
                      {student.is_active ? "Suspender" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL UNIFICADO (CREAR/EDITAR) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-nord-0/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-nord-1 w-full max-w-md rounded-2xl border border-nord-2 shadow-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-nord-6">
                {isEditMode ? "Editar Estudiante" : "Nueva Matrícula"}
              </h2>
              <p className="text-xs text-nord-4 mt-1">
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
                className="w-full bg-nord-0 border border-nord-2 rounded-lg p-3 text-nord-6 focus:border-nord-8 outline-none transition-colors"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Correo institucional"
                required
                className="w-full bg-nord-0 border border-nord-2 rounded-lg p-3 text-nord-6 focus:border-nord-8 outline-none transition-colors"
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
                  className="w-full bg-nord-0 border border-nord-2 rounded-lg p-3 text-nord-6 focus:border-nord-8 outline-none transition-colors"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-nord-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 text-nord-4 hover:text-nord-6 font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-nord-8 text-nord-0 py-2 rounded-lg font-bold hover:bg-nord-9 transition-colors disabled:opacity-50"
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
