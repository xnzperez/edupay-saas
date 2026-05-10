import { api } from "./api";

export interface Contact {
  id: string;
  contact_email: string;
  contact_name: string;
  is_favorite: boolean; // Lo mantenemos por si luego lo usamos visualmente
  created_at: string;
}

export const contactService = {
  getContacts: async (): Promise<Contact[]> => {
    const response = await api.get<{ data: Contact[] }>("/contacts");
    return response.data.data;
  },

  getRecentContacts: async (): Promise<string[]> => {
    const response = await api.get<{ data: string[] }>("/contacts/recent");
    return response.data.data;
  },

  addContact: async (email: string, name: string): Promise<void> => {
    await api.post("/contacts", {
      contact_email: email,
      contact_name: name,
    });
  },

  // Cambiamos a DELETE según la nueva lógica de Go
  removeContact: async (id: string): Promise<void> => {
    await api.delete(`/contacts/${id}`);
  },
};
