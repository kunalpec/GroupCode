import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { roomController } from "../controller/room.controller.js";

const router = Router();

router.post("/create", verifyJWT, roomController.createNewRoom);
router.delete("/delete/:roomId", verifyJWT, roomController.deleteRoom);
router.get("/directory/:roomId", verifyJWT, roomController.getRoomDirectory);
router.get("/all", verifyJWT, roomController.getAllRooms);

export default router;
