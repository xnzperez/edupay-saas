import { useState, useEffect } from "react";
import { getAllInstallments } from "../../services/billing";
import type { AdminInstallmentDTO } from "../../types/billing";

export default function DebtsList() {
  const [debts, setDebts] = useState<AdminInstallmentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const data = await getAllInstallments();
        // Go devuelve null si no hay filas, nos aseguramos de setear un array vacío
        setDebts(data || []);
      } catch (error: any) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebts();
  }, []);

  // Función para renderizar el badge de estado manteniendo el JSX limpio
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="px-3 py-1 bg-nord-14/20 text-nord-14 text-xs font-bold rounded-full">
            PAGADO
          </span>
        );
      case "OVERDUE":
        return (
          <span className="px-3 py-1 bg-nord-11/20 text-nord-11 text-xs font-bold rounded-full">
            EN MORA
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="px-3 py-1 bg-nord-13/20 text-nord-13 text-xs font-bold rounded-full">
            PENDIENTE
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center animate-pulse text-nord-4 font-mono">
        CARGANDO REGISTROS FINANCIEROS...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Control de Obligaciones
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Listado general de todas las deudas emitidas a los estudiantes.
        </p>
      </div>

      <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-nord-4">
            <thead className="bg-nord-2/50 text-xs uppercase text-nord-4 font-bold">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nord-2">
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-nord-4">
                    No hay obligaciones financieras registradas en el sistema.
                  </td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr
                    key={debt.id}
                    className="hover:bg-nord-2/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-nord-6 font-bold">
                        {debt.student_name}
                      </p>
                      <p className="text-xs text-nord-3">
                        {debt.student_email}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {debt.description}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(debt.due_date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-6 py-4 font-bold text-nord-6">
                      ${debt.amount.toLocaleString("es-CO")}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(debt.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
