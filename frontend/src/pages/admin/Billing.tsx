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
import { createInstallment } from "../../services/billing";

// Validación estricta para la generación de la deuda
const billingSchema = z.object({
  concept: z
    .string()
    .min(4, "El concepto debe ser descriptivo (ej. Matrícula)"),
  amount: z.coerce
    .number({ invalid_type_error: "Ingresa un monto válido" })
    .min(5000, "El monto mínimo a facturar es de $5,000 COP"),
  due_date: z.string().min(1, "Debes seleccionar una fecha de vencimiento"),
});

type BillingFormValues = z.infer<typeof billingSchema>;

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResponse | null>(null);
  const [isBilling, setIsBilling] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
  });

  // Reutilizamos nuestra lógica blindada de búsqueda
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
        description: error.response?.data?.error || "Estudiante no encontrado.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Lógica para enviar la deuda a Go
  const onBill = async (data: BillingFormValues) => {
    if (!selectedStudent) return;
    setIsBilling(true);

    try {
      await createInstallment({
        user_id: selectedStudent.id,
        concept: data.concept,
        amount: data.amount,
        due_date: data.due_date,
      });

      sileo.success({
        title: "Cobro Generado",
        description: `Se ha emitido el recibo de $${data.amount.toLocaleString()} a ${selectedStudent.name}.`,
      });

      reset();
      // Opcional: Podrías hacer setSelectedStudent(null) si quieres que busque al siguiente de una vez
    } catch (error: any) {
      sileo.error({
        title: "Error al facturar",
        description:
          error.response?.data?.error || "No se pudo generar la cuota.",
      });
    } finally {
      setIsBilling(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Deudas y Cobros
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Emite cuotas, matrículas o cobros administrativos a los estudiantes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* --- COLUMNA IZQUIERDA: Búsqueda --- */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm">
            <h2 className="text-lg font-bold text-nord-6 mb-4">
              Buscar Deudor
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
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>
        </div>

        {/* --- COLUMNA DERECHA: Resultados y Formulario de Cobro --- */}
        <div className="lg:col-span-7">
          {!selectedStudent && !isSearching && (
            <div className="h-full bg-nord-1/50 border border-dashed border-nord-3 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-nord-4 min-h-[400px]">
              <div className="w-16 h-16 bg-nord-2 rounded-full flex items-center justify-center mb-4 opacity-50 text-2xl">
                📄
              </div>
              <p className="font-medium">
                Busca a un estudiante para emitir un nuevo cobro.
              </p>
            </div>
          )}

          {selectedStudent && (
            <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
              {/* Tarjeta de Identificación */}
              <div className="bg-gradient-to-r from-nord-3 to-nord-2 p-6 border-b border-nord-2 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
                    Estudiante Seleccionado
                  </p>
                  <h3 className="text-2xl font-black text-nord-6">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-sm font-medium text-nord-4">
                    {selectedStudent.email}
                  </p>
                </div>
              </div>

              {/* Formulario de Facturación */}
              <div className="p-6 bg-nord-1">
                <form onSubmit={handleSubmit(onBill)} className="space-y-5">
                  {/* Concepto */}
                  <div>
                    <label className="block text-sm font-bold text-nord-4 tracking-wide mb-2">
                      CONCEPTO DEL COBRO
                    </label>
                    <input
                      type="text"
                      {...register("concept")}
                      placeholder="Ej: Matrícula Semestre 9"
                      className={`w-full px-4 py-3 bg-nord-0 border rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:outline-none transition-all ${
                        errors.concept
                          ? "border-nord-11 focus:ring-nord-11/20"
                          : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                      }`}
                    />
                    {errors.concept && (
                      <p className="text-nord-11 text-xs mt-1 font-bold animate-pulse">
                        {errors.concept.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Monto */}
                    <div>
                      <label className="block text-sm font-bold text-nord-4 tracking-wide mb-2">
                        MONTO (COP)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nord-4 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          {...register("amount")}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-4 py-3 bg-nord-0 border rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:outline-none transition-all ${
                            errors.amount
                              ? "border-nord-11 focus:ring-nord-11/20"
                              : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                          }`}
                        />
                      </div>
                      {errors.amount && (
                        <p className="text-nord-11 text-xs mt-1 font-bold animate-pulse">
                          {errors.amount.message}
                        </p>
                      )}
                    </div>

                    {/* Fecha de Vencimiento */}
                    <div>
                      <label className="block text-sm font-bold text-nord-4 tracking-wide mb-2">
                        VENCE EL
                      </label>
                      <input
                        type="date"
                        {...register("due_date")}
                        className={`w-full px-4 py-3 bg-nord-0 border rounded-xl text-nord-6 focus:ring-4 focus:outline-none transition-all ${
                          errors.due_date
                            ? "border-nord-11 focus:ring-nord-11/20"
                            : "border-nord-3 focus:border-nord-8 focus:ring-nord-8/20"
                        }`}
                      />
                      {errors.due_date && (
                        <p className="text-nord-11 text-xs mt-1 font-bold animate-pulse">
                          {errors.due_date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBilling}
                    className="w-full mt-4 bg-nord-11 hover:bg-red-600 text-nord-0 font-extrabold text-lg py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    {isBilling ? "Procesando Cobro..." : "EMITIR COBRO"}
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
