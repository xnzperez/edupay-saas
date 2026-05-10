import { api } from "./api";

export interface Student {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_active: boolean; // Reflejamos el cambio de la base de datos
}

export interface EnrollStudentData {
  full_name: string;
  email: string;
  password: string;
}

export interface UpdateStudentData {
  full_name: string;
  email: string;
}

export const getStudents = async (): Promise<Student[]> => {
  const response = await api.get("/admin/students");
  return response.data.data;
};

export const enrollStudent = async (data: EnrollStudentData): Promise<void> => {
  await api.post("/admin/students", data);
};

// NUEVO: Editar datos básicos
export const updateStudent = async (
  id: string,
  data: UpdateStudentData,
): Promise<void> => {
  await api.patch(`/admin/students/${id}`, data);
};

// NUEVO: Suspender o Reactivar
export const updateStudentStatus = async (
  id: string,
  isActive: boolean,
): Promise<void> => {
  await api.patch(`/admin/students/${id}/status`, { is_active: isActive });
};
