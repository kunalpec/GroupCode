import { Room } from "../model/room.model.js";
import { Invite } from "../model/invite.model.js";
import { User } from "../model/user.model.js";

import { ApiError } from "../util/ApiError.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";
import { mailSender } from "../util/mailSender.util.js";

// ===============================
// 1. SEND INVITE
// ===============================
const sendInvite = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { inviteToken, email } = req.body;

  const room = await Room.findOne({ inviteToken });
  if (!room) throw new ApiError(404, "Room not found");

  // 🔐 Only owner
  if (room.owner.toString() !== ownerId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const invitedUser = await User.findOne({ email });
  if (!invitedUser) throw new ApiError(404, "User not found");

  // ❌ self invite
  if (invitedUser._id.toString() === ownerId.toString()) {
    throw new ApiError(400, "Cannot invite yourself");
  }

  // ❌ duplicate
  const existing = await Invite.findOne({
    room_id: room._id,
    userother: invitedUser._id,
    status: "pending",
  });

  if (existing) throw new ApiError(400, "Invite already sent");

  const invite = await Invite.create({
    room_id: room._id,
    userown: ownerId,
    userother: invitedUser._id,
  });

  const inviteLink = `${process.env.FRONTEND_URL}/join/${inviteToken}`;

  await mailSender({
    to: invitedUser.email,
    subject: "Room Invite",
    html: `
      <h3>You are invited to join a room</h3>
      <p>Click below to join:</p>
      <a href="${inviteLink}">${inviteLink}</a>
    `,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { invite }, "Invite sent successfully"));
});

// ===============================
// 2. SEARCH USER
// ===============================
const searchUserByEmail = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(200)
      .json(new ApiResponse(200, { users: [] }, "No query provided"));
  }

  const users = await User.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  }).select("name email avatar"); // ✅ limit fields

  return res
    .status(200)
    .json(new ApiResponse(200, { users }, "Users fetched successfully"));
});

// ===============================
// 3. SHOW INVITES
// ===============================
const showInvites = asyncHandler(async (req, res) => {
  const user = req.user;

  const invites = await Invite.find({ userother: user._id })
    .populate("room_id", "inviteToken")
    .populate("userown", "name email avatar") // ✅ fixed
    .sort({ createdAt: -1 })
    .limit(10);

  return res
    .status(200)
    .json(new ApiResponse(200, { invites }, "Invites fetched successfully"));
});

// ===============================
// 4. ACCEPT / DECLINE INVITE
// ===============================
const ActionOnInvite = asyncHandler(async (req, res) => {
  const { inviteId, action } = req.body;
  const user = req.user;

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invite not found");

  // 🔐 Only invited user
  if (invite.userother.toString() !== user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  // ❌ already handled
  if (invite.status !== "pending") {
    throw new ApiError(400, "Already processed");
  }

  // ❌ invalid action
  if (!["accepted", "declined"].includes(action)) {
    throw new ApiError(400, "Invalid action");
  }

  // ✅ update status
  invite.status = action;
  await invite.save();

  // ✅ if accepted → add to room
  if (action === "accepted") {
    const room = await Room.findById(invite.room_id);

    if (!room.users.includes(user._id)) {
      room.users.push(user._id);
      await room.save();
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { invite },
      action === "accepted" ? "Invite accepted" : "Invite declined"
    )
  );
});

const NumberOfInvitesSend = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const count = await Invite.countDocuments({
    userown: userId,
  });

  return res.status(200).json(
    new ApiResponse(200, { count }, "Invite count fetched")
  );
});

// ===============================
export const inviteController = {
  sendInvite,
  searchUserByEmail,
  showInvites,
  ActionOnInvite,
  NumberOfInvitesSend
};