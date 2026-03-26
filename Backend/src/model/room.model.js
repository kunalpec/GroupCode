import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The "Display Name" (e.g., "MERN Project")
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    // The internal folder name (e.g., "room_1")
    // REMOVED 'unique: true' because multiple users will have a "room_1"
    dockerRoomName: {
      type: String,
      required: true,
      trim: true,
    },
    // The unique string for the invite link (nanoid)
    inviteToken: {
      type: String,
      required: true,
      unique: true, // This MUST be unique for the join link to work
      index: true,
    },
    // Current path inside the container
    path: {
      type: String,
      required: true,
    },
    // List of users currently allowed in the room
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 🔒 COMPOUND INDEX: Prevents the same owner from having two "room_1" folders
roomSchema.index({ owner: 1, dockerRoomName: 1 }, { unique: true });

export const Room = mongoose.model("Room", roomSchema);