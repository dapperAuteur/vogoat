/**
 * Invariant 7: admin is whoever signs in with ADMIN_EMAIL (env), never a hardcoded address.
 * Pure so the bootstrap rule is unit-testable.
 */
export function isAdminEmail(email: string, adminEmail: string | undefined): boolean {
  if (!adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}
