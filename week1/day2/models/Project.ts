import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  description?: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  managerId: Types.ObjectId;
  teamId?: Types.ObjectId;
  startDate?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema<IProject> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Tenant orgId is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
      default: 'PLANNING',
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project Manager ID is required'],
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ orgId: 1, status: 1 });
ProjectSchema.index({ orgId: 1, managerId: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
