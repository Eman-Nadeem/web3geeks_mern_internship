import { Types } from 'mongoose';
import connectDB from './db';
import AuditLog, { IAuditLog } from '../models/AuditLog';

export interface CreateAuditLogParams {
  orgId: string | Types.ObjectId;
  actorId: string | Types.ObjectId;
  action: string;
  entityType: 'Organization' | 'User' | 'Project' | 'Task' | 'Team';
  entityId: string | Types.ObjectId;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Creates an audit log entry in the database.
 * Fails gracefully (logs error) to avoid blocking primary business operations.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<IAuditLog | null> {
  try {
    await connectDB();
    const auditEntry = await AuditLog.create({
      orgId: new Types.ObjectId(params.orgId),
      actorId: new Types.ObjectId(params.actorId),
      action: params.action,
      entityType: params.entityType,
      entityId: new Types.ObjectId(params.entityId),
      details: params.details || {},
      ipAddress: params.ipAddress || '127.0.0.1',
      timestamp: new Date(),
    });
    return auditEntry;
  } catch (error) {
    console.error('Failed to create AuditLog entry:', error);
    return null;
  }
}
