import { AsyncLocalStorage } from "node:async_hooks";
import type { UserRole } from "@prisma/client";

export interface RequestContext { organizationId: string; userId: string; role: UserRole }
export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentOrganization(): string {
  const context = requestContext.getStore();
  if (!context) throw new Error("Request context is unavailable.");
  return context.organizationId;
}
