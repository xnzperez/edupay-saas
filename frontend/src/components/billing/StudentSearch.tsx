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
      <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Buscar Estudiante
        </h2>
        <form onSubmit={onSearch} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-foreground">
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
              className="w-full pl-11 pr-4 py-3 bg-background border border-line rounded-xl text-foreground placeholder-muted focus:ring-4 focus:border-primary focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="w-full bg-primary hover:bg-primary-hover text-background font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      {searchResults.length > 0 && !selectedStudentId && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Resultados encontrados
          </p>
          {searchResults.map((student) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="bg-surface p-4 rounded-xl border border-line hover:border-primary cursor-pointer transition-colors group flex items-center justify-between"
            >
              <div>
                <p className="text-foreground font-bold group-hover:text-primary transition-colors">
                  {student.full_name}
                </p>
                <p className="text-foreground text-xs">{student.email}</p>
              </div>
              <div className="text-muted group-hover:text-primary transition-colors">
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
