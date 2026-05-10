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
          <span className="px-3 py-1 bg-success/20 text-success text-xs font-bold rounded-full">
            PAGADO
          </span>
        );
      case "OVERDUE":
        return (
          <span className="px-3 py-1 bg-danger/20 text-danger text-xs font-bold rounded-full">
            EN MORA
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
            PENDIENTE
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center animate-pulse text-foreground font-mono">
        CARGANDO REGISTROS FINANCIEROS...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Control de Obligaciones
        </h1>
        <p className="text-foreground mt-2 font-medium">
          Listado general de todas las deudas emitidas a los estudiantes.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-line/50 text-xs uppercase text-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-foreground">
                    No hay obligaciones financieras registradas en el sistema.
                  </td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr
                    key={debt.id}
                    className="hover:bg-line/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-foreground font-bold">
                        {debt.student_name}
                      </p>
                      <p className="text-xs text-muted">
                        {debt.student_email}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {debt.description}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(debt.due_date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
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
