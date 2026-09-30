import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { TranscriptController } from "./transcript.controller.js";

const router = Router();

router.get("/my", auth(Role.STUDENT), TranscriptController.getMyTranscript);

export const TranscriptRoutes = router;
