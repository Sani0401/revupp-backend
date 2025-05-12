import express from "express";
import getAllProperties from "../services/crm/Hubspot/contact/get-all-properties.js";
import getCreatedLead from "../services/crm/Hubspot/webhook/get-created-lead.js";
const crmRouter = express.Router();

crmRouter.get("/", (req, res) => {
    res.status(200).json({ message: "crm route works!" });
});


crmRouter.post("/hubspot/webhook/get-created-lead", async (req, res) => {
    try {
        console.log("Webhook triggered");
        await getCreatedLead(req, res);
        console.log("Request body:", req.body);
        res.status(200).json({ message: "Webhook received" });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


crmRouter.get('/hubspot/get-properties', async (req, res) => {
    try {
        const enterprise_id = req.query.enterprise_id;
        if (!enterprise_id) {
            return res.status(400).json({ error: "enterprise_id is required" });
        }
        console.log('logging enterprise_id from crm ', enterprise_id);

        const result = await getAllProperties({ enterprise_ID: enterprise_id });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default crmRouter;