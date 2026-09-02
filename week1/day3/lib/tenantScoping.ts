import { Types } from 'mongoose';

/**
 * Utility to enforce tenant-level data isolation on all database queries.
 * Automatically injects `{ orgId: new Types.ObjectId(orgId) }` into query objects.
 * 
 * @param query - Base query filter
 * @param orgId - Current authenticated tenant / Organization ID
 * @returns Scoped query object ensuring no cross-tenant data leaks
 */
export function withTenant<T extends Record<string, any>>(
  query: T,
  orgId: string | Types.ObjectId
): T & { orgId: Types.ObjectId } {
  if (!orgId) {
    throw new Error('SECURITY_FATAL: Attempted database query without a valid tenant orgId context!');
  }

  const tenantObjectId = typeof orgId === 'string' ? new Types.ObjectId(orgId) : orgId;

  return {
    ...query,
    orgId: tenantObjectId,
  };
}

/**
 * Validates whether two tenant IDs match.
 */
export function isSameTenant(
  orgIdA: string | Types.ObjectId,
  orgIdB: string | Types.ObjectId
): boolean {
  if (!orgIdA || !orgIdB) return false;
  return orgIdA.toString() === orgIdB.toString();
}
