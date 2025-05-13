import express from 'express';
import verifylead from '../services/core/Lead/verify-lead.js';
const coreRouter = express.Router();

coreRouter.get("/", (req, res) => {
    res.status(200).json({ message: "core route works!" });
}
);
coreRouter.post("/verify-lead", async(req, res) => {
    console.log("Logging the req body: ",req.body);
   const response = await verifylead(req.body);
    res.status(200).json({ message: "test route works!", data: response });
});

export default coreRouter;