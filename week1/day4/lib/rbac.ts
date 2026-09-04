import { NextResponse } from 'next/server';
import { JWTPayload, getAuthSession } from './auth';

export type Role = 'SuperAdmin' | 'OrgAdmin' | 'ProjectManager' | 'TeamMember';

export type Permission =
  | 'ORG_MANAGE'
  | 'USER_INVITE'
  | 'USER_MANAGE'
  | 'PROJECT_CREATE'
  | 'PROJECT_READ'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DELETE'
  | 'TASK_CREATE'
  | 'TASK_READ'
  | 'TASK_UPDATE'
  | 'TASK_DELETE'
  | 'TEAM_READ'
  | 'TEAM_MANAGE';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SuperAdmin: [
    'ORG_MANAGE',
    'USER_INVITE',
    'USER_MANAGE',
    'PROJECT_CREATE',
    'PROJECT_READ',
    'PROJECT_UPDATE',
    'PROJECT_DELETE',
    'TASK_CREATE',
    'TASK_READ',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TEAM_READ',
    'TEAM_MANAGE',
  ],
  OrgAdmin: [
    'ORG_MANAGE',
    'USER_INVITE',
    'USER_MANAGE',
    'PROJECT_CREATE',
    'PROJECT_READ',
    'PROJECT_UPDATE',
    'PROJECT_DELETE',
    'TASK_CREATE',
    'TASK_READ',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TEAM_READ',
    'TEAM_MANAGE',
  ],
  ProjectManager: [
    'PROJECT_READ',
    'PROJECT_UPDATE',
    'TASK_CREATE',
    'TASK_READ',
    'TASK_UPDATE',
    'TASK_DELETE',
    'TEAM_READ',
    'TEAM_MANAGE',
  ],
  TeamMember: ['PROJECT_READ', 'TASK_READ', 'TASK_UPDATE', 'TEAM_READ'],
};

/**
 * Checks if a given role possesses a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Guard function to enforce Authentication on API Routes.
 * Returns verified JWTPayload if valid, or a 401 NextResponse if unauthenticated.
 */
export async function requireAuth(
  req: Request
): Promise<{ user: JWTPayload; error: null } | { user: null; error: NextResponse }> {
  // Check header injected by middleware first
  const userId = req.headers.get('x-user-id');
  const orgId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role') as Role | null;
  const email = req.headers.get('x-user-email') || '';

  if (userId && orgId && role) {
    return {
      user: { userId, orgId, role, email },
      error: null,
    };
  }

  // Fallback to manual session token verification
  const session = await getAuthSession(req);
  if (!session) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication token is missing or invalid' },
        { status: 401 }
      ),
    };
  }

  return { user: session, error: null };
}

/**
 * Guard function to enforce RBAC Permissions on API Routes.
 * Returns verified user if authorized, or a 401/403 NextResponse if unauthorized.
 */
export async function requirePermission(
  req: Request,
  permission: Permission
): Promise<{ user: JWTPayload; error: null } | { user: null; error: NextResponse }> {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult;

  const user = authResult.user;
  if (!hasPermission(user.role, permission)) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: `Role '${user.role}' lacks permission '${permission}' required for this action`,
        },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
