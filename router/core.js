import express from 'express';
const coreRouter = express.Router();

coreRouter.get("/", (req, res) => {
    res.status(200).json({ message: "core route works!" });
}
);
coreRouter.post("/verify-lead", (req, res) => {
    console.log("Logging the req body: ",req.body);
    res.status(200).json({ message: "test route works!" });
}
);

export default coreRouter;