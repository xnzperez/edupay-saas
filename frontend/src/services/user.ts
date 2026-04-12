import { api } from "./api";

export interface StudentSearchResponse {
  id: string;
  name: string;
  email: string;
  balance: number;
  status: "ACTIVE" | "BLOCKED";
}

export const searchStudentByEmail = async (
  email: string,
): Promise<StudentSearchResponse> => {
  // Pasamos el email como Query Parameter (?email=...)
  const response = await api.get<StudentSearchResponse>(
    `/users/search?email=${encodeURIComponent(email)}`,
  );
  return response.data;
};
