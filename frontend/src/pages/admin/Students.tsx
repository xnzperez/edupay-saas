import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sileo } from "sileo";

// Importamos los servicios reales
import {
  searchStudentByEmail,
  type StudentSearchResponse,
} from "../../services/user";
import { depositFunds } from "../../services/wallet";

// Validación estricta para el formulario de dinero
const depositSchema = z.object({
  amount: z
    .number({ message: "Ingresa un monto válido" })
    .min(1000, "El monto mínimo es de $1,000 COP")
    .max(5000000, "El límite por transacción es $5,000,000 COP"),
});

type DepositFormValues = z.infer<typeof depositSchema>;

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResponse | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
  });

  // Conexión real: Búsqueda en Go
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSelectedStudent(null);

    try {
      const student = await searchStudentByEmail(searchQuery);
      setSelectedStudent(student);
    } catch (error: any) {
      sileo.error({
        title: "Búsqueda fallida",
        description: (error.response?.data?.message || error.response?.data?.error) || "Estudiante no encontrado.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Conexión real: Depósito en Go
  const onDeposit = async (data: DepositFormValues) => {
    if (!selectedStudent) return;
    setIsDepositing(true);

    try {
      const response = await depositFunds(selectedStudent.id, {
        amount: data.amount,
      });

      // Actualizamos el saldo visualmente si Go responde OK
      setSelectedStudent({
        ...selectedStudent,
        balance: selectedStudent.balance + data.amount,
      });

      sileo.success({
        title: "Transacción Exitosa",
        description:
          response.message ||
          `Se depositaron $${data.amount.toLocaleString()} COP.`,
      });

      reset();
    } catch (error: any) {
      sileo.error({
        title: "Error en el depósito",
        description:
          (error.response?.data?.message || error.response?.data?.error) ||
          "Hubo un problema al procesar la recarga.",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Caja / Recargas
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Busca a un estudiante por correo institucional o ID para depositar
          fondos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* --- COLUMNA IZQUIERDA: Búsqueda --- */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm">
            <h2 className="text-lg font-bold text-nord-6 mb-4">
              Buscar Estudiante
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ej. isaac@campusucc.edu.co"
                  className="w-full px-4 py-3 bg-nord-0 border border-nord-3 rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:border-nord-8 focus:ring-nord-8/20 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="w-full bg-nord-8 hover:bg-nord-9 text-nord-0 font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSearching ? "Buscando en la base de datos..." : "Buscar"}
              </button>
            </form>
          </div>
        </div>

        {/* --- COLUMNA DERECHA: Resultados y Acción --- */}
        <div className="lg:col-span-7">
          {!selectedStudent && !isSearching && (
            <div className="h-full bg-nord-1/50 border border-dashed border-nord-3 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-nord-4 min-h-[300px]">
              <div className="w-16 h-16 bg-nord-2 rounded-full flex items-center justify-center mb-4 opacity-50">
                🔍
              </div>
              <p className="font-medium">
                Ingresa un correo para iniciar una transacción.
              </p>
            </div>
          )}

          {selectedStudent && (
            <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
              {/* Tarjeta de Identificación */}
              <div className="bg-gradient-to-r from-nord-3 to-nord-2 p-6 border-b border-nord-2 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
                    Titular de la cuenta
                  </p>
                  <h3 className="text-2xl font-black text-nord-6">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-sm font-medium text-nord-4">
                    {selectedStudent.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
                    Saldo Actual
                  </p>
                  <h3 className="text-3xl font-black text-nord-8">
                    ${selectedStudent.balance.toLocaleString()}
                  </h3>
                </div>
              </div>

              {/* Formulario de Depósito */}
              <div className="p-6 bg-nord-1">
                <form onSubmit={handleSubmit(onDeposit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-nord-4 tracking-wide mb-2">
                      MONTO A DEPOSITAR (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-nord-4 font-bold text-xl">
                        $
                      </span>
                      <input
                        type="number"
                        {...register("amount", { valueAsNumber: true })}
                        placeholder="50000"
                        className={`w-full pl-10 pr-4 py-4 bg-nord-0 border rounded-xl text-nord-6 font-bold text-xl placeholder-nord-3 focus:ring-4 focus:outline-none transition-all ${
                          errors.amount
                            ? "border-nord-11 focus:ring-nord-11/20"
                            : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-nord-11 text-xs mt-2 font-bold animate-pulse">
                        {errors.amount.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="w-full bg-nord-14 hover:bg-green-600 text-nord-0 font-extrabold text-lg py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    {isDepositing
                      ? "Procesando depósito seguro..."
                      : "APROBAR DEPÓSITO"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
