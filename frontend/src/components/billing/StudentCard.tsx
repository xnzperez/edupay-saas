import type { StudentSearchResult } from "../../types/billing";

interface StudentCardProps {
  student: StudentSearchResult;
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <div className="bg-gradient-to-r from-nord-3 to-nord-2 p-6 border-b border-nord-2 flex justify-between items-center">
      <div>
        <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
          Estudiante Seleccionado
        </p>
        <h3 className="text-2xl font-black text-nord-6">
          {student.full_name}
        </h3>
        <p className="text-sm font-medium text-nord-4">
          {student.email}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
          Saldo Billetera
        </p>
        <p className="text-2xl font-black text-nord-14">
          ${student.current_balance.toLocaleString("es-CO")}
        </p>
      </div>
    </div>
  );
}
