import { Room } from "../model/room.model.js";
import { Invite } from "../model/invite.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../util/ApiError.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";
import { mailSender } from "../util/mailSender.util.js";

const sendInvite = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { inviteToken, email } = req.body;

  if (!inviteToken || !email) {
    throw new ApiError(400, "Invite token and email are required");
  }

  const room = await Room.findOne({ inviteToken });
  if (!room) throw new ApiError(404, "Room not found");

  if (room.owner.toString() !== ownerId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const invitedUser = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!invitedUser) throw new ApiError(404, "User not found");

  if (invitedUser._id.toString() === ownerId.toString()) {
    throw new ApiError(400, "Cannot invite yourself");
  }

  if (room.users.some((memberId) => memberId.toString() === invitedUser._id.toString())) {
    throw new ApiError(400, "User is already a member of this room");
  }

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

  await mailSender(
    invitedUser.email,
    "Room Invite",
    `
      <h3>You are invited to join a room</h3>
      <p>Click below to join:</p>
      <a href="${inviteLink}">${inviteLink}</a>
    `,
  );

  return res.status(200).json(
    new ApiResponse(200, "Invite sent successfully", { invite }),
  );
});

const searchUserByEmail = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(200)
      .json(new ApiResponse(200, "No query provided", { users: [] }));
  }

  const users = await User.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  }).select("name email avatar");

  return res.status(200).json(
    new ApiResponse(200, "Users fetched successfully", { users }),
  );
});

const showInvites = asyncHandler(async (req, res) => {
  const invites = await Invite.find({ userother: req.user._id })
    .populate("room_id", "inviteToken roomName")
    .populate("userown", "name email avatar")
    .sort({ createdAt: -1 })
    .limit(10);

  return res.status(200).json(
    new ApiResponse(200, "Invites fetched successfully", { invites }),
  );
});

const ActionOnInvite = asyncHandler(async (req, res) => {
  const { inviteId, action } = req.body;
  const user = req.user;

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invite not found");

  if (invite.userother.toString() !== user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (invite.status !== "pending") {
    throw new ApiError(400, "Already processed");
  }

  if (!["accepted", "declined"].includes(action)) {
    throw new ApiError(400, "Invalid action");
  }

  invite.status = action;
  await invite.save();

  if (action === "accepted") {
    const room = await Room.findById(invite.room_id);
    if (room && !room.users.some((memberId) => memberId.toString() === user._id.toString())) {
      room.users.push(user._id);
      await room.save();
    }
  }

  return res.status(200).json(
    new ApiResponse(200, action === "accepted" ? "Invite accepted" : "Invite declined", {
      invite,
    }),
  );
});

const deleteInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invite not found");

  if (invite.userother.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  await invite.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, "Invite removed successfully", { inviteId }),
  );
});

const NumberOfInvitesSend = asyncHandler(async (req, res) => {
  const count = await Invite.countDocuments({
    userown: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, "Invite count fetched", { count }),
  );
});

export const inviteController = {
  sendInvite,
  searchUserByEmail,
  showInvites,
  ActionOnInvite,
  deleteInvite,
  NumberOfInvitesSend,
};
