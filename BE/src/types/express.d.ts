import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: {
        id: string;
        organizationId: string;
        email: string;
        role: UserRole;
      };
      sessionToken?: string;
    }
  }
}

export {};
