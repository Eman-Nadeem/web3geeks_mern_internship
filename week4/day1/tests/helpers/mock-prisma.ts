import { Role } from "@/types";

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

export class InMemoryPrisma {
  public users: Map<string, UserRecord> = new Map();
  public organizations: Map<string, OrgRecord> = new Map();
  public memberships: Map<string, MemberRecord> = new Map();

  public reset() {
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
      if (data.name) org.name = data.name;
      if (data.slug) org.slug = data.slug;
      org.updatedAt = new Date();
      return this.applySelect(org, select);
    },
    delete: async ({ where, select }: any) => {
      const org = this.organizations.get(where.id);
      if (!org) {
        throw new MockPrismaError("Record not found", "P2025");
      }
      // Cascade delete memberships
      for (const [id, m] of this.memberships.entries()) {
        if (m.organizationId === org.id) {
          this.memberships.delete(id);
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
    findUnique: async ({ where }: any) => {
      if (where.userId_organizationId) {
        const { userId, organizationId } = where.userId_organizationId;
        for (const m of this.memberships.values()) {
          if (m.userId === userId && m.organizationId === organizationId) {
            return { ...m };
          }
        }
      }
      return null;
    },
    findMany: async ({ where, include }: any) => {
      let list = Array.from(this.memberships.values());
      if (where?.userId) {
        list = list.filter((m) => m.userId === where.userId);
      }
      if (where?.organizationId) {
        list = list.filter((m) => m.organizationId === where.organizationId);
      }

      const results = list.map((m) => {
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
        id: crypto.randomUUID(),
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
        joinedAt: new Date(),
      };
      this.memberships.set(record.id, record);
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
