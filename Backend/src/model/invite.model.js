import mongoose, { Schema } from "mongoose";

const inviteSchema = new Schema(
  {
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    userown: {
      // The user who sent the invitation
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userother: {
      // The user who received the invitation
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // To quickly find all invites for a user
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const Invite = mongoose.model("Invite", inviteSchema);
