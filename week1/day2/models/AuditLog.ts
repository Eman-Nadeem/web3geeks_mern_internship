import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  entityType: 'Organization' | 'User' | 'Project' | 'Task' | 'Team';
  entityId: Types.ObjectId;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Tenant orgId is required'],
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor userId is required'],
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['Organization', 'User', 'Project', 'Task', 'Team'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ orgId: 1, timestamp: -1 });
AuditLogSchema.index({ orgId: 1, actorId: 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
