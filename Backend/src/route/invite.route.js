import express from "express";
import { inviteController } from "../controller/invite.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===============================
// 📩 SEND INVITE
// ===============================
router.post("/send-invite",verifyJWT,inviteController.sendInvite);

// ===============================
// 🔍 SEARCH USER (by email/name)
// ===============================
router.get("/search-user",verifyJWT,inviteController.searchUserByEmail);

// ===============================
// 📥 GET ALL INVITES (for logged user)
// ===============================
router.get("/my-invites",verifyJWT,inviteController.showInvites);

// ===============================
// ✅ ACCEPT / ❌ DECLINE INVITE
// ===============================
router.post("/action",verifyJWT,inviteController.ActionOnInvite);

// ===============================
// 📊 COUNT / STATS OF SENT INVITES
// ===============================
router.get("/stats",verifyJWT,inviteController.NumberOfInvitesSend);

export default router;