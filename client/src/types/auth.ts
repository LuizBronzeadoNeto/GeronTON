export type Role = "cuidador" | "profissional";

export interface User {
  id: number;
  role: Role;
  token: string;
}
