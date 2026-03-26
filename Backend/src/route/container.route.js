import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { containerController } from "../controller/container.controller.js";

const router = Router();

router.post("/create", verifyJWT, containerController.createUserContainer);
router.post("/start", verifyJWT, containerController.startUserContainer);
router.post("/stop", verifyJWT, containerController.stopUserContainer);
router.get("/status", verifyJWT, containerController.getContainerStatus);

export default router;
