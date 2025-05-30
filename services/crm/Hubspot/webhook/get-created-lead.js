import supabase from "../../../../config/supabase.js";
import client from "../../../../config/openai.js";
import axios from "axios";

const getCreatedLead = async (req, res) => {
    try {
        const request = req.body;
        const objectId = request[0]?.objectId;
        if (!objectId) return res.status(400).json({ error: "Invalid objectId" });

        // Step 1: Fetch contact from HubSpot
        const contactUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${objectId}?properties=enterprise_id,hubspot_owner_id`;
        const contactRes = await axios.get(contactUrl, {
            headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
        });
        const contact = contactRes.data;
        const enterprise_id = contact?.properties?.enterprise_id;
        const hubspot_owner_id = contact?.properties?.hubspot_owner_id;

        // Step 2: Get owner's user_id from Supabase
        const ownerUrl = `https://api.hubapi.com/crm/v3/owners/${hubspot_owner_id}`;
        const ownerRes = await axios.get(ownerUrl, {
            headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
        });
        const owner_email = ownerRes?.data?.email;

        const { data: ownerUser, error: ownerError } = await supabase
            .from("users_details")
            .select("user_id")
            .eq("email", owner_email);

        if (ownerError || ownerUser.length === 0) throw new Error("Owner not found in DB");
        const owner_id = ownerUser[0].user_id;

        // Step 3: Fetch selected fields for enterprise
        const { data: selectedFieldsData } = await supabase
            .from("enterprise_lead_config")
            .select("selected_fields")
            .eq("enterprise_id", enterprise_id);
        const selectedFields = JSON.parse(selectedFieldsData[0].selected_fields)
            .filter((field) => field.selected)
            .map((field) => field.name);

        // Step 4: Fetch field values
        const fieldsUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${objectId}?properties=${selectedFields.join(",")}`;
        const fieldDataRes = await axios.get(fieldsUrl, {
            headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
        });
        const leadFields = fieldDataRes.data.properties;

        // Step 5: Qualification check using OpenAI
        const { data: qualificationData } = await supabase
            .from("enterprise_lead_qualification_config")
            .select("qualification_config")
            .eq("enterprise_id", enterprise_id)
            .single();

        const prompt = `Evaluate the following lead data based on the qualification configuration:\n\nQualification Configuration: ${JSON.stringify(
            qualificationData.qualification_config
        )}\n\nLead Data: ${JSON.stringify(
            leadFields
        )}\n\nReply with QUALIFIED or UNQUALIFIED.`;

        const response = await client.responses.create({
            model: "gpt-4.1-nano",
            instructions: "You are an expert lead evaluator. Reply with QUALIFIED or UNQUALIFIED only.",
            input: prompt,
        });

        const evaluation = response?.output_text?.trim();
        if (!evaluation || evaluation === "UNQUALIFIED") {
            await supabase.from("enterprise_lead_details").insert({
                enterprise_id,
                custom_lead_data: leadFields,
                assigned_to: null,
                status: "UNQUALIFIED",
            });
            return res.status(200).json({ message: "Unqualified lead stored." });
        }

        // Step 6: AE Assignment - Round Robin with AE ID
        const { data: configData } = await supabase
            .from("enterprise_assignment_config")
            .select("config")
            .eq("enterprise_id", enterprise_id)
            .single();

        const ae_ids = configData.config.ae_ids;

        const { data: tracker } = await supabase
            .from("enterprise_ae_assignment_tracker")
            .select("last_assigned_ae_id")
            .eq("enterprise_id", enterprise_id)
            .single();

        const lastAssignedAeId = tracker?.last_assigned_ae_id;
        let lastIndex = ae_ids.findIndex(id => id === lastAssignedAeId);
        if (lastIndex === -1) lastIndex = -1;

        const nextIndex = (lastIndex + 1) % ae_ids.length;
        const assigned_ae_id = ae_ids[nextIndex];

        await supabase
            .from("enterprise_ae_assignment_tracker")
            .upsert({
                enterprise_id,
                last_assigned_ae_id: assigned_ae_id,
                updated_at: new Date().toISOString(),
            });

        // Step 7: Get AE Email
        const { data: aeUser } = await supabase
            .from("users_details")
            .select("email")
            .eq("user_id", assigned_ae_id)
            .single();

        // Step 8: Insert into DB and update HubSpot
        await supabase.from("enterprise_lead_details").insert({
            enterprise_id,
            custom_lead_data: leadFields,
            assigned_to: assigned_ae_id,
            status: evaluation,
        });

        await axios.patch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${objectId}`,
            {
                properties: {
                    hubspot_owner_id: assigned_ae_id,
                },
            },
            {
                headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
            }
        );


        res.status(200).json({ message: "Lead processed, qualified and assigned." });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export default getCreatedLead;
