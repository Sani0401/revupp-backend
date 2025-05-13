import authRouter from "./router/auth.js";
import express from "express";
import crmRouter from "./router/crm.js";
import coreRouter from "./router/core.js";
const router = express.Router();

router.use("/auth", authRouter);

router.use("/crm", crmRouter);
router.use("/core", coreRouter);
export default router;