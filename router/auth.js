import express from "express";
import verifyEmail from "../services/auth/verify-email.js";
const authRouter = express.Router();

authRouter.get("/", (req, res) => {
    res.status(200).json({ message: "Auth route works!" });
});


authRouter.post('/verify-email', async (req, res) => {
    try {
        const result = await verifyEmail(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default authRouter;