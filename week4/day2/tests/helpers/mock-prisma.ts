import { Role, InvitationStatus } from "@/types";

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

export class InMemoryPrisma {
  public users: Map<string, UserRecord> = new Map();
  public organizations: Map<string, OrgRecord> = new Map();
  public memberships: Map<string, MemberRecord> = new Map();
  public invitations: Map<string, InvitationRecord> = new Map();

  public reset() {
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
      // Cascade delete memberships and invitations
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
