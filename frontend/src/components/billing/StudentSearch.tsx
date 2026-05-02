import React from "react";
import type { StudentSearchResult } from "../../types/billing";

interface StudentSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  searchResults: StudentSearchResult[];
  selectedStudentId?: string;
  onSelectStudent: (student: StudentSearchResult) => void;
  onSearch: (e?: React.FormEvent) => void;
}

export function StudentSearch({
  searchQuery,
  setSearchQuery,
  isSearching,
  searchResults,
  selectedStudentId,
  onSelectStudent,
  onSearch,
}: StudentSearchProps) {
  return (
    <>
      <div className="bg-nord-1 p-6 rounded-2xl border border-nord-2 shadow-sm">
        <h2 className="text-lg font-bold text-nord-6 mb-4">
          Buscar Estudiante
        </h2>
        <form onSubmit={onSearch} className="space-y-4">
          <div className="relative">
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

      {searchResults.length > 0 && !selectedStudentId && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-xs font-bold text-nord-4 uppercase tracking-wider">
            Resultados encontrados
          </p>
          {searchResults.map((student) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="bg-nord-1 p-4 rounded-xl border border-nord-2 hover:border-nord-8 cursor-pointer transition-colors group flex items-center justify-between"
            >
              <div>
                <p className="text-nord-6 font-bold group-hover:text-nord-8 transition-colors">
                  {student.full_name}
                </p>
                <p className="text-nord-4 text-xs">{student.email}</p>
              </div>
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
    </>
  );
}
