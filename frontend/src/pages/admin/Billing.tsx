import { useStudentSearch } from "../../hooks/useStudentSearch";
import { BillingHeader } from "../../components/billing/BillingHeader";
import { StudentSearch } from "../../components/billing/StudentSearch";
import { StudentCard } from "../../components/billing/StudentCard";
import { InstallmentForm } from "../../components/billing/InstallmentForm";
import { EmptyState } from "../../components/billing/EmptyState";

export default function Billing() {
  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedStudent,
    setSelectedStudent,
    handleSearch,
    clearSelection,
  } = useStudentSearch();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <BillingHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* --- COLUMNA IZQUIERDA: Búsqueda --- */}
        <div className="lg:col-span-5 space-y-6">
          <StudentSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearching={isSearching}
            searchResults={searchResults}
            selectedStudentId={selectedStudent?.id}
            onSelectStudent={setSelectedStudent}
            onSearch={handleSearch}
          />
        </div>

        {/* --- COLUMNA DERECHA: Resultados y Formulario de Cobro --- */}
        <div className="lg:col-span-7">
          {!selectedStudent ? (
            <EmptyState message="Busca y selecciona un estudiante para emitir un nuevo cobro." />
          ) : (
            <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <StudentCard student={selectedStudent} />

              <div className="p-6 bg-nord-1 relative">
                <button
                  onClick={clearSelection}
                  className="absolute top-4 right-6 text-nord-11 hover:text-nord-12 text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>

                <InstallmentForm
                  student={selectedStudent}
                  onSuccess={clearSelection}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
