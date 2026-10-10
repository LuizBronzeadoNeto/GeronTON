export type Role = "cuidador" | "profissional";

export interface User {
  id: number;
  role: Role;
  token: string;
  /** True until the user accepts the current consent term. */
  consentRequired?: boolean;
}
