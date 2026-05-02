import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sileo } from "sileo";

import { searchStudents, createInstallment } from "../../services/billing";
import type { StudentSearchResult } from "../../types/billing";

// Validación estricta para la generación de la deuda
const billingSchema = z.object({
  concept: z
    .string()
    .min(4, "El concepto debe ser descriptivo (ej. Matrícula)"),
  amount: z
    .number({ message: "Ingresa un monto válido" })
    .min(1000, "El monto mínimo a facturar es de $1,000 COP"),
  due_date: z.string().min(1, "Debes seleccionar una fecha de vencimiento"),
});

type BillingFormValues = z.infer<typeof billingSchema>;

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResult | null>(null);
  const [isBilling, setIsBilling] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSelectedStudent(null);
    setSearchResults([]);

    try {
      const students = await searchStudents(searchQuery);
      if (students.length === 0) {
        sileo.info({
          title: "Sin resultados",
          description: "No se encontraron estudiantes con ese dato.",
        });
      } else {
        setSearchResults(students);
      }
    } catch (error: any) {
      sileo.error({
        title: "Búsqueda fallida",
        description:
          (error.response?.data?.message || error.response?.data?.error) ||
          "Error al conectar con la base de datos.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const onBill = async (data: BillingFormValues) => {
    if (!selectedStudent) return;
    setIsBilling(true);

    try {
      await createInstallment({
        user_id: selectedStudent.id,
        description: data.concept, // Mapeamos concept a description para Go
        amount: data.amount,
        due_date: data.due_date,
      });

      sileo.success({
        title: "Cobro Generado",
        description: `Se ha emitido el recibo de $${data.amount.toLocaleString("es-CO")} a ${selectedStudent.full_name}.`,
      });

      reset();
      setSelectedStudent(null);
      setSearchResults([]);
      setSearchQuery("");
    } catch (error: any) {
      sileo.error({
        title: "Error al facturar",
        description:
          (error.response?.data?.message || error.response?.data?.error) || "No se pudo generar la cuota.",
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
          Busca estudiantes, verifica su saldo y emite nuevos cobros.
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
              <div className="relative">
                {/* ICONO LUPA AQUÍ */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-nord-4">
                  <svg
                    className="w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="m17 17l4 4M3 11a8 8 0 1 0 16 0a8 8 0 0 0-16 0"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nombre o correo..."
                  className="w-full pl-11 pr-4 py-3 bg-nord-0 border border-nord-3 rounded-xl text-nord-6 placeholder-nord-3 focus:ring-4 focus:border-nord-8 focus:ring-nord-8/20 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="w-full bg-nord-8 hover:bg-nord-9 text-nord-0 font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>

          {/* LISTA DE RESULTADOS */}
          {searchResults.length > 0 && !selectedStudent && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
                Resultados encontrados
              </p>
              {searchResults.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-nord-1 p-4 rounded-xl border border-nord-2 hover:border-nord-8 cursor-pointer transition-colors group flex items-center justify-between"
                >
                  <div>
                    <p className="text-nord-6 font-bold group-hover:text-nord-8 transition-colors">
                      {student.full_name}
                    </p>
                    <p className="text-nord-4 text-xs">{student.email}</p>
                  </div>
                  {/* ICONO FLECHA */}
                  <div className="text-nord-3 group-hover:text-nord-8 transition-colors">
                    <svg
                      className="w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m7 7l5 5l-5 5m6-10l5 5l-5 5"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- COLUMNA DERECHA: Resultados y Formulario de Cobro --- */}
        <div className="lg:col-span-7">
          {!selectedStudent && (
            <div className="h-full bg-nord-1/50 border border-dashed border-nord-3 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-nord-4 min-h-[400px]">
              {/* ICONO DOCUMENTO VACÍO AQUÍ */}
              <div className="w-16 h-16 bg-nord-2 rounded-full flex items-center justify-center mb-4 text-nord-4">
                <svg
                  className="w-8 h-8"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      strokeDasharray="64"
                      strokeWidth="2"
                      d="M13 3l6 6v12h-14v-18h8"
                    >
                      <animate
                        fill="freeze"
                        attributeName="stroke-dashoffset"
                        dur="0.6s"
                        values="64;0"
                      />
                    </path>
                    <path
                      strokeDasharray="14"
                      strokeDashoffset="14"
                      d="M12.5 3v5.5h6.5"
                    >
                      <animate
                        fill="freeze"
                        attributeName="stroke-dashoffset"
                        begin="0.7s"
                        dur="0.2s"
                        to="0"
                      />
                    </path>
                    <g strokeWidth="2">
                      <path
                        strokeDasharray="6"
                        strokeDashoffset="6"
                        d="M9 13h4"
                      >
                        <animate
                          fill="freeze"
                          attributeName="stroke-dashoffset"
                          begin="0.9s"
                          dur="0.2s"
                          to="0"
                        />
                      </path>
                      <path
                        strokeDasharray="8"
                        strokeDashoffset="8"
                        d="M9 16h6"
                      >
                        <animate
                          fill="freeze"
                          attributeName="stroke-dashoffset"
                          begin="1.1s"
                          dur="0.2s"
                          to="0"
                        />
                      </path>
                    </g>
                  </g>
                </svg>
              </div>
              <p className="font-medium">
                Busca y selecciona un estudiante para emitir un nuevo cobro.
              </p>
            </div>
          )}

          {selectedStudent && (
            <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
              {/* Tarjeta de Identificación y Saldo */}
              <div className="bg-gradient-to-r from-nord-3 to-nord-2 p-6 border-b border-nord-2 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
                    Estudiante Seleccionado
                  </p>
                  <h3 className="text-2xl font-black text-nord-6">
                    {selectedStudent.full_name}
                  </h3>
                  <p className="text-sm font-medium text-nord-4">
                    {selectedStudent.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-nord-4 uppercase tracking-wider mb-1">
                    Saldo Billetera
                  </p>
                  <p className="text-2xl font-black text-nord-14">
                    ${selectedStudent.current_balance.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>

              {/* Formulario de Facturación */}
              <div className="p-6 bg-nord-1 relative">
                {/* Botón para cancelar selección */}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-4 right-6 text-nord-11 hover:text-nord-12 text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>

                <form
                  onSubmit={handleSubmit(onBill)}
                  className="space-y-5 mt-2"
                >
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
                          {...register("amount", { valueAsNumber: true })}
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
                        style={{ colorScheme: "dark" }}
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
