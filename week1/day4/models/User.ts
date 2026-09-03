import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  orgId?: Types.ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  role: 'SuperAdmin' | 'OrgAdmin' | 'ProjectManager' | 'TeamMember';
  status: 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
  inviteToken?: string;
  inviteExpiresAt?: Date;
  refreshTokenHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['SuperAdmin', 'OrgAdmin', 'ProjectManager', 'TeamMember'],
      default: 'TeamMember',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'DEACTIVATED'],
      default: 'ACTIVE',
    },
    inviteToken: {
      type: String,
      index: true,
    },
    inviteExpiresAt: {
      type: Date,
    },
    refreshTokenHash: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
