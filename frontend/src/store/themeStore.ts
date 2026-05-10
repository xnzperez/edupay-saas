import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark", // Por defecto, acorde a la estética Nord/Tokyo Night
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          // Mutación directa al DOM para que Tailwind lo detecte
          const root = window.document.documentElement;
          if (newTheme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
          return { theme: newTheme };
        }),
    }),
    {
      name: "edupay-theme-storage", // Key en localStorage
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, asegurar que la clase se inyecte
        if (state) {
          const root = window.document.documentElement;
          if (state.theme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
        }
      },
    },
  ),
);
