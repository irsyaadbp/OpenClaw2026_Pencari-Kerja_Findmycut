// User management is handled by Better Auth.
// This service only provides helpers for other services that need user context.

export function getUserFromContext(c: any) {
  return {
    userId: c.get("userId") as string | null,
    user: c.get("user") as any,
  };
}
