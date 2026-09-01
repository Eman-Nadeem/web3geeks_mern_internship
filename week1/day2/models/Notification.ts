import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'TEAM_ADDED' | 'USER_INVITED';
  isRead: boolean;
  linkUrl?: string;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Tenant orgId is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient userId is required'],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TEAM_ADDED', 'USER_INVITED'],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    linkUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ orgId: 1, userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
