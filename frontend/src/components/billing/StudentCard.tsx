import type { StudentSearchResult } from "../../types/billing";

interface StudentCardProps {
  student: StudentSearchResult;
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <div className="bg-gradient-to-r from-line to-line p-6 border-b border-line flex justify-between items-center">
      <div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
          Estudiante Seleccionado
        </p>
        <h3 className="text-2xl font-black text-foreground">
          {student.full_name}
        </h3>
        <p className="text-sm font-medium text-foreground">
          {student.email}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
          Saldo Billetera
        </p>
        <p className="text-2xl font-black text-success">
          ${student.current_balance.toLocaleString("es-CO")}
        </p>
      </div>
    </div>
  );
}
