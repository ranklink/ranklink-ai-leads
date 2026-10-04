import { AsyncLocalStorage } from "node:async_hooks";
import type { UserRole } from "@prisma/client";

export interface AuthContext { organizationId: string; userId: string; role: UserRole }
export const authContext = new AsyncLocalStorage<AuthContext>();

export function currentOrganization(): string {
  const context = authContext.getStore();
  if (!context) return "dev-organization";
  return context.organizationId;
}
