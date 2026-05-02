import { useState } from "react";
import axios from "axios";
import { sileo } from "sileo";
import { searchStudents } from "../services/billing";
import type { StudentSearchResult } from "../types/billing";

export function useStudentSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Los errores globales ya los maneja el interceptor en api.ts
        console.error("Error buscando estudiantes:", error.message);
      } else {
        console.error("Error inesperado:", error);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearSelection = () => {
    setSelectedStudent(null);
    setSearchResults([]);
    setSearchQuery("");
  };

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedStudent,
    setSelectedStudent,
    handleSearch,
    clearSelection,
  };
}
