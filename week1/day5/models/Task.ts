import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITask extends Document {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status: 'TO_DO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: Types.ObjectId;
  reporterId: Types.ObjectId;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Tenant orgId is required'],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'],
      default: 'TO_DO',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ orgId: 1, projectId: 1, status: 1 });
TaskSchema.index({ orgId: 1, assigneeId: 1, status: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
