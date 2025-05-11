import authRouter from "./router/auth.js";
import express from "express";
import crmRouter from "./router/crm.js";
const router = express.Router();

router.use("/auth", authRouter);

router.use("/crm", crmRouter);
export default router;