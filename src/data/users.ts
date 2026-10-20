import { Role } from "@/lib/rbac";

export interface DeskUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

/** Dummy staff list for the access page */
export const USERS: DeskUser[] = [
  { id: "u-1", name: "Vansh", username: "vansh", role: "super_admin" },
  { id: "u-2", name: "Ritika Sharma", username: "ritika", role: "admin" },
  { id: "u-3", name: "Mohit Jain", username: "mohit", role: "assignment_desk" },
  { id: "u-4", name: "Sunita Rathore", username: "sunita", role: "assignment_desk" },
  { id: "u-5", name: "Arvind Meena", username: "arvind", role: "assignment_desk" },
  { id: "u-6", name: "Rajendra Singh", username: "rajendra", role: "chief_editor" },
];
