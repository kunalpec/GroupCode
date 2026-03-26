import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true, // Index for faster message retrieval per room
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    ok: {
      type: Boolean,
      default: true,
    },
  },
  {
    // This option adds `createdAt` and `updatedAt` fields
    timestamps: true,
  },
);

export const Message = mongoose.model("Message", messageSchema);
