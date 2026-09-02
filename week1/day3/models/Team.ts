import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITeam extends Document {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  description?: string;
  leaderId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema<ITeam> = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Tenant orgId is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team Leader ID is required'],
    },
    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

TeamSchema.index({ orgId: 1, name: 1 });

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
