import { Role, InvitationStatus, ProjectStatus, TaskStatus, TaskPriority } from "@/types";

export class MockPrismaError extends Error {
  public code: string;
  public meta?: { target?: string[]; [key: string]: unknown };

  constructor(message: string, code: string, meta?: { target?: string[]; [key: string]: unknown }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
  }
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OrgRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemberRecord {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  joinedAt: Date;
}

interface InvitationRecord {
  id: string;
  email: string;
  organizationId: string;
  role: Role;
  token: string; // SHA-256 hash
  status: InvitationStatus;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
  addedAt: Date;
  addedById: string;
}

interface TaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdById: string;
  assigneeId: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryPrisma {
  public users: Map<string, UserRecord> = new Map();
  public organizations: Map<string, OrgRecord> = new Map();
  public memberships: Map<string, MemberRecord> = new Map();
  public invitations: Map<string, InvitationRecord> = new Map();
  public projects: Map<string, ProjectRecord> = new Map();
  public projectMembers: Map<string, ProjectMemberRecord> = new Map();
  public tasks: Map<string, TaskRecord> = new Map();
  public activities: Map<string, any> = new Map();
  public notifications: Map<string, any> = new Map();
  public comments: Map<string, any> = new Map();
  public presenceSessions: Map<string, any> = new Map();

  public reset() {
    this.presenceSessions.clear();
    this.comments.clear();
    this.notifications.clear();
    this.activities.clear();
    this.tasks.clear();
    this.projectMembers.clear();
    this.projects.clear();
    this.invitations.clear();
    this.memberships.clear();
    this.organizations.clear();
    this.users.clear();
  }

  public user = {
    findUnique: async ({ where, select }: { where: { id?: string; email?: string }; select?: any }) => {
      let u: UserRecord | undefined;
      if (where.id) u = this.users.get(where.id);
      else if (where.email) {
        for (const user of this.users.values()) {
          if (user.email.toLowerCase() === where.email.toLowerCase()) {
            u = user;
            break;
          }
        }
      }
      if (!u) return null;
      return this.applySelect(u, select);
    },
    findMany: async () => Array.from(this.users.values()),
    create: async ({ data, select }: { data: any; select?: any }) => {
      for (const existing of this.users.values()) {
        if (existing.email.toLowerCase() === data.email.toLowerCase()) {
          throw new MockPrismaError("Unique constraint failed", "P2002", {
            target: ["email"],
          });
        }
      }
      const record: UserRecord = {
        id: data.id || crypto.randomUUID(),
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
        avatar: data.avatar || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(record.id, record);
      return this.applySelect(record, select);
    },
    update: async ({ where, data, select }: any) => {
      let u: any;
      if (where.id) u = this.users.get(where.id);
      else if (where.email) {
        for (const user of this.users.values()) {
          if (user.email.toLowerCase() === where.email.toLowerCase()) {
            u = user;
            break;
          }
        }
      }
      if (!u) throw new MockPrismaError("User not found", "P2025");
      Object.assign(u, data, { updatedAt: new Date() });
      return this.applySelect(u, select);
    },
    upsert: async ({ where, create, update }: any) => {
      let existing = await this.user.findUnique({ where });
      if (existing) {
        const u = this.users.get(existing.id)!;
        Object.assign(u, update, { updatedAt: new Date() });
        return u;
      }
      return this.user.create({ data: create });
    },
    deleteMany: async () => {
      const count = this.users.size;
      this.users.clear();
      return { count };
    },
  };

  public organization = {
    findUnique: async ({ where, select, include }: any) => {
      let org: OrgRecord | undefined;
      if (where.id) org = this.organizations.get(where.id);
      else if (where.slug) {
        for (const o of this.organizations.values()) {
          if (o.slug === where.slug) {
            org = o;
            break;
          }
        }
      }
      if (!org) return null;
      const res: any = { ...org };
      if (include?._count?.select?.memberships) {
        const count = Array.from(this.memberships.values()).filter(
          (m) => m.organizationId === org!.id
        ).length;
        res._count = { memberships: count };
      }
      return this.applySelect(res, select);
    },
    findMany: async () => Array.from(this.organizations.values()),
    create: async ({ data, select }: any) => {
      for (const existing of this.organizations.values()) {
        if (existing.slug === data.slug) {
          throw new MockPrismaError("Unique constraint failed", "P2002", {
            target: ["slug"],
          });
        }
      }
      const record: OrgRecord = {
        id: data.id || crypto.randomUUID(),
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        ownerId: data.ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.organizations.set(record.id, record);
      return this.applySelect(record, select);
    },
    update: async ({ where, data, select }: any) => {
      const org = this.organizations.get(where.id);
      if (!org) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      if (data.slug && data.slug !== org.slug) {
        for (const o of this.organizations.values()) {
          if (o.id !== org.id && o.slug === data.slug) {
            throw new MockPrismaError("Unique constraint failed", "P2002", {
              target: ["slug"],
            });
          }
        }
        org.slug = data.slug;
      }
      if (data.name !== undefined) org.name = data.name;
      if (data.description !== undefined) org.description = data.description;
      if (data.logoUrl !== undefined) org.logoUrl = data.logoUrl;
      org.updatedAt = new Date();
      return this.applySelect(org, select);
    },
    delete: async ({ where, select }: any) => {
      const org = this.organizations.get(where.id);
      if (!org) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      // Cascade delete memberships, invitations, projects, projectMembers, tasks
      for (const [id, m] of this.memberships.entries()) {
        if (m.organizationId === org.id) {
          this.memberships.delete(id);
        }
      }
      for (const [id, inv] of this.invitations.entries()) {
        if (inv.organizationId === org.id) {
          this.invitations.delete(id);
        }
      }
      for (const [pId, p] of this.projects.entries()) {
        if (p.organizationId === org.id) {
          for (const [pmId, pm] of this.projectMembers.entries()) {
            if (pm.projectId === p.id) this.projectMembers.delete(pmId);
          }
          for (const [tId, t] of this.tasks.entries()) {
            if (t.projectId === p.id) this.tasks.delete(tId);
          }
          this.projects.delete(pId);
        }
      }
      this.organizations.delete(org.id);
      return this.applySelect(org, select);
    },
    deleteMany: async () => {
      const count = this.organizations.size;
      this.organizations.clear();
      return { count };
    },
  };

  public membership = {
    findUnique: async ({ where, include }: any) => {
      let m: MemberRecord | undefined;
      if (where.id) {
        m = this.memberships.get(where.id);
      } else if (where.userId_organizationId) {
        const { userId, organizationId } = where.userId_organizationId;
        for (const item of this.memberships.values()) {
          if (item.userId === userId && item.organizationId === organizationId) {
            m = item;
            break;
          }
        }
      }
      if (!m) return null;
      const res: any = { ...m };
      if (include?.user) {
        const u = this.users.get(m.userId);
        res.user = u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              avatar: u.avatar,
            }
          : null;
      }
      if (include?.organization) {
        const org = this.organizations.get(m.organizationId);
        res.organization = org ? { ...org } : null;
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      let list = Array.from(this.memberships.values());
      if (where?.id) list = list.filter((m) => m.id === where.id);
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      if (where?.organizationId) list = list.filter((m) => m.organizationId === where.organizationId);
      if (where?.role) list = list.filter((m) => m.role === where.role);

      const m = list[0];
      if (!m) return null;
      const res: any = { ...m };
      if (include?.user) {
        const u = this.users.get(m.userId);
        res.user = u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              avatar: u.avatar,
            }
          : null;
      }
      if (include?.organization) {
        const org = this.organizations.get(m.organizationId);
        res.organization = org ? { ...org } : null;
      }
      return res;
    },
    count: async ({ where }: any) => {
      let list = Array.from(this.memberships.values());
      if (where?.organizationId) list = list.filter((m) => m.organizationId === where.organizationId);
      if (where?.role) list = list.filter((m) => m.role === where.role);
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      return list.length;
    },
    findMany: async ({ where, include }: any) => {
      let list = Array.from(this.memberships.values());
      if (where?.userId) {
        list = list.filter((m) => m.userId === where.userId);
      }
      if (where?.organizationId) {
        list = list.filter((m) => m.organizationId === where.organizationId);
      }
      if (where?.role) {
        list = list.filter((m) => m.role === where.role);
      }

      let results = list.map((m) => {
        const res: any = { ...m };
        if (include?.organization) {
          const org = this.organizations.get(m.organizationId);
          res.organization = {
            ...org,
            _count: {
              memberships: Array.from(this.memberships.values()).filter(
                (x) => x.organizationId === m.organizationId
              ).length,
            },
          };
        }
        if (include?.user) {
          const u = this.users.get(m.userId);
          res.user = u
            ? {
                id: u.id,
                name: u.name,
                email: u.email,
                avatar: u.avatar,
              }
            : null;
        }
        return res;
      });

      // Filter by search matching name or email case-insensitively if specified in where.user OR custom query
      if (where?.user) {
        if (where.user.OR) {
          results = results.filter((r) => {
            if (!r.user) return false;
            return where.user.OR.some((clause: any) => {
              if (clause.name?.contains) {
                return r.user.name.toLowerCase().includes(clause.name.contains.toLowerCase());
              }
              if (clause.email?.contains) {
                return r.user.email.toLowerCase().includes(clause.email.contains.toLowerCase());
              }
              return false;
            });
          });
        }
      }

      return results;
    },
    create: async ({ data }: any) => {
      for (const m of this.memberships.values()) {
        if (m.userId === data.userId && m.organizationId === data.organizationId) {
          throw new MockPrismaError("Unique constraint failed", "P2002", {
            target: ["userId", "organizationId"],
          });
        }
      }
      const record: MemberRecord = {
        id: data.id || crypto.randomUUID(),
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
        joinedAt: new Date(),
      };
      this.memberships.set(record.id, record);
      return { ...record };
    },
    delete: async ({ where }: any) => {
      let targetId: string | undefined = where.id;
      if (!targetId && where.userId_organizationId) {
        const { userId, organizationId } = where.userId_organizationId;
        for (const [id, m] of this.memberships.entries()) {
          if (m.userId === userId && m.organizationId === organizationId) {
            targetId = id;
            break;
          }
        }
      }
      if (!targetId || !this.memberships.has(targetId)) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      const record = this.memberships.get(targetId)!;
      this.memberships.delete(targetId);
      return { ...record };
    },
    upsert: async ({ where, create, update }: any) => {
      const existing = await this.membership.findUnique({ where });
      if (existing) {
        const m = this.memberships.get(existing.id)!;
        Object.assign(m, update);
        return { ...m };
      }
      return this.membership.create({ data: create });
    },
    deleteMany: async () => {
      const count = this.memberships.size;
      this.memberships.clear();
      return { count };
    },
  };

  public invitation = {
    findUnique: async ({ where, include }: any) => {
      let inv: InvitationRecord | undefined;
      if (where.id) inv = this.invitations.get(where.id);
      else if (where.token) {
        for (const item of this.invitations.values()) {
          if (item.token === where.token) {
            inv = item;
            break;
          }
        }
      }
      if (!inv) return null;
      const res: any = { ...inv };
      if (include?.organization) {
        const org = this.organizations.get(inv.organizationId);
        res.organization = org ? { ...org } : null;
      }
      if (include?.invitedBy) {
        const user = this.users.get(inv.invitedById);
        res.invitedBy = user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }
          : null;
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      let list = Array.from(this.invitations.values());
      if (where?.id) list = list.filter((i) => i.id === where.id);
      if (where?.token) list = list.filter((i) => i.token === where.token);
      if (where?.organizationId) list = list.filter((i) => i.organizationId === where.organizationId);
      if (where?.email) list = list.filter((i) => i.email.toLowerCase() === where.email.toLowerCase());
      if (where?.status) {
        if (typeof where.status === "string") {
          list = list.filter((i) => i.status === where.status);
        } else if (where.status?.in) {
          list = list.filter((i) => where.status.in.includes(i.status));
        }
      }

      const inv = list[0];
      if (!inv) return null;
      const res: any = { ...inv };
      if (include?.organization) {
        const org = this.organizations.get(inv.organizationId);
        res.organization = org ? { ...org } : null;
      }
      if (include?.invitedBy) {
        const user = this.users.get(inv.invitedById);
        res.invitedBy = user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }
          : null;
      }
      return res;
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let list = Array.from(this.invitations.values());
      if (where?.organizationId) list = list.filter((i) => i.organizationId === where.organizationId);
      if (where?.email) list = list.filter((i) => i.email.toLowerCase() === where.email.toLowerCase());
      if (where?.status) {
        if (typeof where.status === "string") {
          list = list.filter((i) => i.status === where.status);
        } else if (where.status?.in) {
          list = list.filter((i) => where.status.in.includes(i.status));
        }
      }

      return list.map((inv) => {
        const res: any = { ...inv };
        if (include?.organization) {
          const org = this.organizations.get(inv.organizationId);
          res.organization = org ? { ...org } : null;
        }
        if (include?.invitedBy) {
          const user = this.users.get(inv.invitedById);
          res.invitedBy = user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
              }
            : null;
        }
        return res;
      });
    },
    create: async ({ data, include }: any) => {
      for (const existing of this.invitations.values()) {
        if (existing.token === data.token) {
          throw new MockPrismaError("Unique constraint failed", "P2002", {
            target: ["token"],
          });
        }
      }
      const record: InvitationRecord = {
        id: data.id || crypto.randomUUID(),
        email: data.email.toLowerCase(),
        organizationId: data.organizationId,
        role: data.role,
        token: data.token,
        status: data.status || "PENDING",
        invitedById: data.invitedById,
        expiresAt: data.expiresAt,
        acceptedAt: data.acceptedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.invitations.set(record.id, record);
      const res: any = { ...record };
      if (include?.invitedBy) {
        const user = this.users.get(record.invitedById);
        res.invitedBy = user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }
          : null;
      }
      return res;
    },
    update: async ({ where, data, include }: any) => {
      let inv: InvitationRecord | undefined;
      if (where.id) inv = this.invitations.get(where.id);
      else if (where.token) {
        for (const item of this.invitations.values()) {
          if (item.token === where.token) {
            inv = item;
            break;
          }
        }
      }
      if (!inv) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      if (data.token !== undefined) inv.token = data.token;
      if (data.status !== undefined) inv.status = data.status;
      if (data.role !== undefined) inv.role = data.role;
      if (data.expiresAt !== undefined) inv.expiresAt = data.expiresAt;
      if (data.acceptedAt !== undefined) inv.acceptedAt = data.acceptedAt;
      if (data.invitedById !== undefined) inv.invitedById = data.invitedById;
      inv.updatedAt = new Date();

      const res: any = { ...inv };
      if (include?.organization) {
        const org = this.organizations.get(inv.organizationId);
        res.organization = org ? { ...org } : null;
      }
      if (include?.invitedBy) {
        const user = this.users.get(inv.invitedById);
        res.invitedBy = user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }
          : null;
      }
      return res;
    },
    delete: async ({ where }: any) => {
      const inv = this.invitations.get(where.id);
      if (!inv) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      this.invitations.delete(where.id);
      return { ...inv };
    },
    deleteMany: async () => {
      const count = this.invitations.size;
      this.invitations.clear();
      return { count };
    },
  };

  public project = {
    findUnique: async ({ where, include, select }: any) => {
      let p: ProjectRecord | undefined;
      if (where.id) p = this.projects.get(where.id);
      if (!p) return null;
      const res = this.hydrateProject(p, include);
      return this.applySelect(res, select);
    },
    findFirst: async ({ where, include, select }: any) => {
      let list = Array.from(this.projects.values());
      if (where?.id) list = list.filter((p) => p.id === where.id);
      if (where?.organizationId) list = list.filter((p) => p.organizationId === where.organizationId);
      if (where?.name) list = list.filter((p) => p.name.toLowerCase() === where.name.toLowerCase());
      if (where?.status) list = list.filter((p) => p.status === where.status);
      const p = list[0];
      if (!p) return null;
      const res = this.hydrateProject(p, include);
      return this.applySelect(res, select);
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let list = Array.from(this.projects.values());
      if (where?.organizationId) {
        list = list.filter((p) => p.organizationId === where.organizationId);
      }
      if (where?.ownerId) {
        list = list.filter((p) => p.ownerId === where.ownerId);
      }
      if (where?.status) {
        if (typeof where.status === "string") {
          list = list.filter((p) => p.status === where.status);
        } else if (where.status.in && Array.isArray(where.status.in)) {
          list = list.filter((p) => where.status.in.includes(p.status));
        }
      }
      if (where?.id?.in && Array.isArray(where.id.in)) {
        list = list.filter((p) => where.id.in.includes(p.id));
      }
      if (where?.OR && Array.isArray(where.OR)) {
        list = list.filter((p) => {
          return where.OR.some((condition: any) => {
            if (condition.ownerId && p.ownerId === condition.ownerId) return true;
            if (condition.members?.some?.userId) {
              const targetUserId = condition.members.some.userId;
              const hasMember = Array.from(this.projectMembers.values()).some(
                (pm) => pm.projectId === p.id && pm.userId === targetUserId
              );
              if (hasMember) return true;
            }
            if (condition.name?.contains) {
              const term = condition.name.contains.toLowerCase();
              if (p.name.toLowerCase().includes(term)) return true;
            }
            if (condition.description?.contains) {
              const term = condition.description.contains.toLowerCase();
              if (p.description?.toLowerCase().includes(term)) return true;
            }
            return false;
          });
        });
      }
      if (where?.AND && Array.isArray(where.AND)) {
        list = list.filter((p) => {
          return where.AND.every((cond: any) => {
            if (cond.OR && Array.isArray(cond.OR)) {
              return cond.OR.some((innerCond: any) => {
                if (innerCond.name?.contains) {
                  return p.name.toLowerCase().includes(innerCond.name.contains.toLowerCase());
                }
                if (innerCond.description?.contains) {
                  return p.description?.toLowerCase().includes(innerCond.description.contains.toLowerCase());
                }
                if (innerCond.ownerId && p.ownerId === innerCond.ownerId) return true;
                if (innerCond.members?.some?.userId) {
                  const targetUserId = innerCond.members.some.userId;
                  return Array.from(this.projectMembers.values()).some(
                    (pm) => pm.projectId === p.id && pm.userId === targetUserId
                  );
                }
                return false;
              });
            }
            return true;
          });
        });
      }
      if (orderBy?.createdAt) {
        list.sort((a, b) =>
          orderBy.createdAt === "desc"
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
      return list.map((p) => this.hydrateProject(p, include));
    },
    create: async ({ data, include, select }: any) => {
      const record: ProjectRecord = {
        id: data.id || crypto.randomUUID(),
        organizationId: data.organizationId,
        name: data.name,
        description: data.description || null,
        status: data.status || "PLANNING",
        ownerId: data.ownerId,
        createdById: data.createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.projects.set(record.id, record);
      const res = this.hydrateProject(record, include);
      return this.applySelect(res, select);
    },
    update: async ({ where, data, include, select }: any) => {
      const p = this.projects.get(where.id);
      if (!p) throw new MockPrismaError("Record not found", "P2025");
      if (data.name !== undefined) p.name = data.name;
      if (data.description !== undefined) p.description = data.description;
      if (data.status !== undefined) p.status = data.status;
      if (data.ownerId !== undefined) p.ownerId = data.ownerId;
      p.updatedAt = new Date();
      const res = this.hydrateProject(p, include);
      return this.applySelect(res, select);
    },
    delete: async ({ where }: any) => {
      const p = this.projects.get(where.id);
      if (!p) throw new MockPrismaError("Record not found", "P2025");
      for (const [pmId, pm] of this.projectMembers.entries()) {
        if (pm.projectId === p.id) this.projectMembers.delete(pmId);
      }
      for (const [tId, t] of this.tasks.entries()) {
        if (t.projectId === p.id) this.tasks.delete(tId);
      }
      this.projects.delete(where.id);
      return { ...p };
    },
    count: async ({ where }: any) => {
      let list = Array.from(this.projects.values());
      if (where?.organizationId) list = list.filter((p) => p.organizationId === where.organizationId);
      if (where?.status) list = list.filter((p) => p.status === where.status);
      return list.length;
    },
    deleteMany: async () => {
      const count = this.projects.size;
      this.projects.clear();
      return { count };
    },
  };

  public projectMember = {
    findUnique: async ({ where, include }: any) => {
      let pm: ProjectMemberRecord | undefined;
      if (where.id) pm = this.projectMembers.get(where.id);
      else if (where.projectId_userId) {
        const { projectId, userId } = where.projectId_userId;
        for (const item of this.projectMembers.values()) {
          if (item.projectId === projectId && item.userId === userId) {
            pm = item;
            break;
          }
        }
      }
      if (!pm) return null;
      return this.hydrateProjectMember(pm, include);
    },
    findFirst: async ({ where, include }: any) => {
      let list = Array.from(this.projectMembers.values());
      if (where?.id) list = list.filter((m) => m.id === where.id);
      if (where?.projectId) list = list.filter((m) => m.projectId === where.projectId);
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      const pm = list[0];
      if (!pm) return null;
      return this.hydrateProjectMember(pm, include);
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let list = Array.from(this.projectMembers.values());
      if (where?.projectId) list = list.filter((m) => m.projectId === where.projectId);
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      if (where?.project?.organizationId) {
        const orgId = where.project.organizationId;
        list = list.filter((m) => {
          const proj = this.projects.get(m.projectId);
          return proj && proj.organizationId === orgId;
        });
      }
      if (orderBy?.addedAt) {
        list.sort((a, b) =>
          orderBy.addedAt === "desc"
            ? b.addedAt.getTime() - a.addedAt.getTime()
            : a.addedAt.getTime() - b.addedAt.getTime()
        );
      }
      return list.map((m) => this.hydrateProjectMember(m, include));
    },
    create: async ({ data, include }: any) => {
      for (const existing of this.projectMembers.values()) {
        if (existing.projectId === data.projectId && existing.userId === data.userId) {
          throw new MockPrismaError("Unique constraint failed", "P2002", {
            target: ["projectId_userId"],
          });
        }
      }
      const record: ProjectMemberRecord = {
        id: data.id || crypto.randomUUID(),
        projectId: data.projectId,
        userId: data.userId,
        addedAt: new Date(),
        addedById: data.addedById,
      };
      this.projectMembers.set(record.id, record);
      return this.hydrateProjectMember(record, include);
    },
    upsert: async ({ where, create, update }: any) => {
      const existing = await this.projectMember.findUnique({ where });
      if (existing) {
        const pm = this.projectMembers.get(existing.id)!;
        Object.assign(pm, update);
        return pm;
      }
      return this.projectMember.create({ data: create });
    },
    delete: async ({ where }: any) => {
      let targetId: string | undefined;
      if (where.id) targetId = where.id;
      else if (where.projectId_userId) {
        const { projectId, userId } = where.projectId_userId;
        for (const [id, item] of this.projectMembers.entries()) {
          if (item.projectId === projectId && item.userId === userId) {
            targetId = id;
            break;
          }
        }
      }
      if (!targetId || !this.projectMembers.has(targetId)) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      const pm = this.projectMembers.get(targetId)!;
      this.projectMembers.delete(targetId);
      return { ...pm };
    },
    count: async ({ where }: any) => {
      let list = Array.from(this.projectMembers.values());
      if (where?.projectId) list = list.filter((m) => m.projectId === where.projectId);
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      return list.length;
    },
    deleteMany: async ({ where }: any = {}) => {
      let toDelete: string[] = [];
      for (const [id, m] of this.projectMembers.entries()) {
        let match = true;
        if (where?.userId && m.userId !== where.userId) match = false;
        if (where?.projectId && m.projectId !== where.projectId) match = false;
        if (where?.project?.organizationId) {
          const proj = this.projects.get(m.projectId);
          if (!proj || proj.organizationId !== where.project.organizationId) match = false;
        }
        if (match) toDelete.push(id);
      }
      for (const id of toDelete) {
        this.projectMembers.delete(id);
      }
      return { count: toDelete.length };
    },
  };

  public task = {
    findUnique: async ({ where, include }: any) => {
      let t: TaskRecord | undefined;
      if (where.id) t = this.tasks.get(where.id);
      if (!t) return null;
      return this.hydrateTask(t, include);
    },
    findFirst: async ({ where, include }: any) => {
      let list = this.filterTasks(where);
      const t = list[0];
      if (!t) return null;
      return this.hydrateTask(t, include);
    },
    findMany: async ({ where, include, orderBy, skip, take }: any) => {
      let list = this.filterTasks(where);
      if (orderBy) {
        const orderKey = Object.keys(orderBy)[0];
        const dir = orderBy[orderKey] === "desc" ? -1 : 1;
        list.sort((a: any, b: any) => {
          const valA = a[orderKey];
          const valB = b[orderKey];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          if (valA instanceof Date && valB instanceof Date) {
            return (valA.getTime() - valB.getTime()) * dir;
          }
          if (typeof valA === "string" && typeof valB === "string") {
            return valA.localeCompare(valB) * dir;
          }
          return (valA < valB ? -1 : 1) * dir;
        });
      }
      if (skip) list = list.slice(skip);
      if (take) list = list.slice(0, take);
      return list.map((t) => this.hydrateTask(t, include));
    },
    create: async ({ data, include }: any) => {
      const record: TaskRecord = {
        id: data.id || crypto.randomUUID(),
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        status: data.status || "TODO",
        priority: data.priority || "MEDIUM",
        createdById: data.createdById,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.tasks.set(record.id, record);
      return this.hydrateTask(record, include);
    },
    update: async ({ where, data, include }: any) => {
      const t = this.tasks.get(where.id);
      if (!t) throw new MockPrismaError("Record not found", "P2025");
      if (data.title !== undefined) t.title = data.title;
      if (data.description !== undefined) t.description = data.description;
      if (data.status !== undefined) t.status = data.status;
      if (data.priority !== undefined) t.priority = data.priority;
      if (data.assigneeId !== undefined) t.assigneeId = data.assigneeId;
      if (data.dueDate !== undefined) t.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      if (data.completedAt !== undefined) t.completedAt = data.completedAt ? new Date(data.completedAt) : null;
      t.updatedAt = new Date();
      return this.hydrateTask(t, include);
    },
    delete: async ({ where }: any) => {
      const t = this.tasks.get(where.id);
      if (!t) throw new MockPrismaError("Record not found", "P2025");
      this.tasks.delete(where.id);
      return { ...t };
    },
    count: async ({ where }: any) => {
      return this.filterTasks(where).length;
    },
    groupBy: async ({ by, where, _count }: any) => {
      const list = this.filterTasks(where);
      const groups = new Map<string, number>();
      for (const item of list) {
        const key = (item as any)[by[0]] || "";
        groups.set(key, (groups.get(key) || 0) + 1);
      }
      const results: any[] = [];
      for (const [val, count] of groups.entries()) {
        const entry: any = { [by[0]]: val };
        if (_count) {
          entry._count = { _all: count, id: count };
        }
        results.push(entry);
      }
      return results;
    },
    aggregate: async ({ where, _count }: any) => {
      const count = this.filterTasks(where).length;
      return {
        _count: {
          _all: count,
          id: count,
        },
      };
    },
    deleteMany: async () => {
      const count = this.tasks.size;
      this.tasks.clear();
      return { count };
    },
  };

  private filterTasks(where: any): TaskRecord[] {
    let list = Array.from(this.tasks.values());
    if (!where) return list;
    if (where.id) list = list.filter((t) => t.id === where.id);
    if (where.projectId) {
      if (typeof where.projectId === "string") {
        list = list.filter((t) => t.projectId === where.projectId);
      } else if (where.projectId.in && Array.isArray(where.projectId.in)) {
        list = list.filter((t) => where.projectId.in.includes(t.projectId));
      }
    }
    if (where.project?.organizationId) {
      const orgId = where.project.organizationId;
      const orgProjectIds = new Set(
        Array.from(this.projects.values())
          .filter((p) => p.organizationId === orgId)
          .map((p) => p.id)
      );
      list = list.filter((t) => orgProjectIds.has(t.projectId));
    }
    if (where.status) {
      if (typeof where.status === "string") {
        list = list.filter((t) => t.status === where.status);
      } else if (where.status.not) {
        list = list.filter((t) => t.status !== where.status.not);
      } else if (where.status.in && Array.isArray(where.status.in)) {
        list = list.filter((t) => where.status.in.includes(t.status));
      }
    }
    if (where.priority) {
      if (typeof where.priority === "string") {
        list = list.filter((t) => t.priority === where.priority);
      } else if (where.priority.in && Array.isArray(where.priority.in)) {
        list = list.filter((t) => where.priority.in.includes(t.priority));
      }
    }
    if (where.assigneeId !== undefined) {
      if (where.assigneeId === null) {
        list = list.filter((t) => t.assigneeId === null);
      } else if (typeof where.assigneeId === "string") {
        list = list.filter((t) => t.assigneeId === where.assigneeId);
      } else if (where.assigneeId && where.assigneeId.in && Array.isArray(where.assigneeId.in)) {
        list = list.filter((t) => t.assigneeId && where.assigneeId.in.includes(t.assigneeId));
      }
    }
    if (where.dueDate) {
      if (where.dueDate.lt) {
        const threshold = new Date(where.dueDate.lt).getTime();
        list = list.filter((t) => t.dueDate !== null && t.dueDate.getTime() < threshold);
      }
      if (where.dueDate.lte) {
        const threshold = new Date(where.dueDate.lte).getTime();
        list = list.filter((t) => t.dueDate !== null && t.dueDate.getTime() <= threshold);
      }
      if (where.dueDate.gt) {
        const threshold = new Date(where.dueDate.gt).getTime();
        list = list.filter((t) => t.dueDate !== null && t.dueDate.getTime() > threshold);
      }
      if (where.dueDate.gte) {
        const threshold = new Date(where.dueDate.gte).getTime();
        list = list.filter((t) => t.dueDate !== null && t.dueDate.getTime() >= threshold);
      }
    }
    if (where.OR && Array.isArray(where.OR)) {
      list = list.filter((t) => {
        return where.OR.some((cond: any) => {
          if (cond.title?.contains) {
            const term = cond.title.contains.toLowerCase();
            if (t.title.toLowerCase().includes(term)) return true;
          }
          if (cond.description?.contains) {
            const term = cond.description.contains.toLowerCase();
            if (t.description?.toLowerCase().includes(term)) return true;
          }
          return false;
        });
      });
    }
    if (where.AND && Array.isArray(where.AND)) {
      list = list.filter((t) => {
        return where.AND.every((cond: any) => {
          return this.filterTasks(cond).some((matching) => matching.id === t.id);
        });
      });
    }
    return list;
  }

  private hydrateProject(p: ProjectRecord, include?: any) {
    const res: any = { ...p };
    if (include?.owner) {
      const u = this.users.get(p.ownerId);
      res.owner = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    if (include?.createdBy) {
      const u = this.users.get(p.createdById);
      res.createdBy = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    if (include?.members) {
      const mems = Array.from(this.projectMembers.values()).filter((m) => m.projectId === p.id);
      res.members = mems.map((m) => {
        const u = this.users.get(m.userId);
        return {
          ...m,
          user: u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null,
        };
      });
    }
    if (include?.tasks) {
      res.tasks = Array.from(this.tasks.values()).filter((t) => t.projectId === p.id);
    }
    if (include?._count?.select?.members) {
      res._count = {
        ...res._count,
        members: Array.from(this.projectMembers.values()).filter((m) => m.projectId === p.id).length,
      };
    }
    if (include?._count?.select?.tasks) {
      res._count = {
        ...res._count,
        tasks: Array.from(this.tasks.values()).filter((t) => t.projectId === p.id).length,
      };
    }
    return res;
  }

  private hydrateProjectMember(pm: ProjectMemberRecord, include?: any) {
    const res: any = { ...pm };
    if (include?.user) {
      const u = this.users.get(pm.userId);
      res.user = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    if (include?.addedBy) {
      const u = this.users.get(pm.addedById);
      res.addedBy = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    if (include?.project) {
      const p = this.projects.get(pm.projectId);
      res.project = p ? { ...p } : null;
    }
    return res;
  }

  private hydrateTask(t: TaskRecord, include?: any) {
    const res: any = { ...t };
    if (include?.project) {
      const p = this.projects.get(t.projectId);
      res.project = p ? { ...p } : null;
    }
    if (include?.createdBy) {
      const u = this.users.get(t.createdById);
      res.createdBy = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    if (include?.assignee) {
      const u = t.assigneeId ? this.users.get(t.assigneeId) : null;
      res.assignee = u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar } : null;
    }
    return res;
  }

  public activity = {
    create: async ({ data }: { data: any }) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
      this.activities.set(record.id, record);
      return record;
    },
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let list = Array.from(this.activities.values());
      if (where) {
        if (where.organizationId) list = list.filter((a) => a.organizationId === where.organizationId);
        if (where.projectId) list = list.filter((a) => a.projectId === where.projectId);
        if (where.taskId) list = list.filter((a) => a.taskId === where.taskId);
        if (where.type) list = list.filter((a) => a.type === where.type);
        if (where.actorId) list = list.filter((a) => a.actorId === where.actorId);
      }
      if (orderBy?.createdAt) {
        list.sort((a, b) =>
          orderBy.createdAt === "desc"
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
      if (skip) list = list.slice(skip);
      if (take) list = list.slice(0, take);
      return list;
    },
    count: async ({ where }: any = {}) => {
      let list = Array.from(this.activities.values());
      if (where) {
        if (where.organizationId) list = list.filter((a) => a.organizationId === where.organizationId);
        if (where.projectId) list = list.filter((a) => a.projectId === where.projectId);
        if (where.taskId) list = list.filter((a) => a.taskId === where.taskId);
        if (where.type) list = list.filter((a) => a.type === where.type);
        if (where.actorId) list = list.filter((a) => a.actorId === where.actorId);
      }
      return list.length;
    },
  };

  public notification = {
    create: async ({ data }: { data: any }) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), isRead: false, readAt: null, ...data };
      this.notifications.set(record.id, record);
      return record;
    },
    count: async ({ where }: any = {}) => {
      let list = Array.from(this.notifications.values());
      if (where) {
        if (where.userId) list = list.filter((n) => n.userId === where.userId);
        if (where.isRead !== undefined) list = list.filter((n) => n.isRead === where.isRead);
        if (where.type) list = list.filter((n) => n.type === where.type);
      }
      return list.length;
    },
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let list = Array.from(this.notifications.values());
      if (where) {
        if (where.userId) list = list.filter((n) => n.userId === where.userId);
        if (where.isRead !== undefined) list = list.filter((n) => n.isRead === where.isRead);
        if (where.type) list = list.filter((n) => n.type === where.type);
      }
      if (orderBy?.createdAt) {
        list.sort((a, b) =>
          orderBy.createdAt === "desc"
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
      if (skip) list = list.slice(skip);
      if (take) list = list.slice(0, take);
      return list;
    },
    findUnique: async ({ where }: any) => this.notifications.get(where.id) || null,
    update: async ({ where, data }: any) => {
      const n = this.notifications.get(where.id);
      if (!n) return null;
      Object.assign(n, data);
      return n;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const n of this.notifications.values()) {
        if (!where || ((where.userId === undefined || n.userId === where.userId) &&
                       (where.isRead === undefined || n.isRead === where.isRead))) {
          Object.assign(n, data);
          count++;
        }
      }
      return { count };
    },
  };

  private hydrateComment(c: any) {
    const user = this.users.get(c.authorId);
    const author = user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null;
    const task = this.tasks.get(c.taskId);
    return {
      ...c,
      author,
      task: task ? { id: task.id, projectId: task.projectId } : null,
    };
  }

  public comment = {
    create: async ({ data }: any) => {
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "ACTIVE",
        editedAt: null,
        ...data,
      };
      this.comments.set(record.id, record);
      return this.hydrateComment(record);
    },
    findFirst: async ({ where }: any) => {
      for (const c of this.comments.values()) {
        if (where.id && c.id !== where.id) continue;
        if (where.taskId && c.taskId !== where.taskId) continue;
        return this.hydrateComment(c);
      }
      return null;
    },
    findUnique: async ({ where }: any) => {
      const c = this.comments.get(where.id);
      return c ? this.hydrateComment(c) : null;
    },
    findMany: async () => Array.from(this.comments.values()).map((c) => this.hydrateComment(c)),
    update: async ({ where, data }: any) => {
      const c = this.comments.get(where.id);
      if (!c) return null;
      Object.assign(c, data, { updatedAt: new Date() });
      return this.hydrateComment(c);
    },
  };

  public presenceSession = {
    upsert: async ({ where, create, update }: any) => {
      const existing = this.presenceSessions.get(where.userId);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const record = { id: crypto.randomUUID(), ...create };
      this.presenceSessions.set(where.userId, record);
      return record;
    },
    deleteMany: async () => ({ count: 0 }),
    findMany: async () => Array.from(this.presenceSessions.values()),
  };

  public async $transaction(fn: (tx: any) => Promise<any>): Promise<any> {
    return fn(this);
  }

  public async $queryRaw(_strings: TemplateStringsArray): Promise<any> {
    return [{ 1: 1 }];
  }

  public async $disconnect(): Promise<void> {}

  private applySelect(obj: any, select?: Record<string, boolean>): any {
    if (!select) return obj;
    const res: any = {};
    for (const [k, v] of Object.entries(select)) {
      if (v) res[k] = obj[k];
    }
    return res;
  }
}

export const inMemoryPrisma = new InMemoryPrisma();
