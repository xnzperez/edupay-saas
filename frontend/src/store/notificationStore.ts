import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: "success" | "info" | "warning";
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (
    title: string,
    description: string,
    type?: Notification["type"],
  ) => void;
  markAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      // Datos iniciales para que la demo no empiece vacía
      notifications: [
        {
          id: "1",
          title: "Sistema Iniciado",
          description: "El núcleo de EduPay SaaS está operando con normalidad.",
          type: "info",
          timestamp: new Date().toISOString(),
          read: false,
        },
      ],

      addNotification: (title, description, type = "success") =>
        set((state) => ({
          notifications: [
            {
              id: Math.random().toString(36).substring(7),
              title,
              description,
              type,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 10), // Guardamos solo las últimas 10 para no saturar
        })),

      markAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: "edupay-notifications" }, // Se guarda en LocalStorage automáticamente
  ),
);
