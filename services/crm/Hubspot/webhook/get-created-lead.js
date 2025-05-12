import supabase from "../../../../config/supabase.js";
import axios from "axios";

const getCreatedLead = async (req, res) => {
    try {
        console.log("Webhook payload:", req.body);

        const request = req.body;
        const objectId = request[0]?.objectId;

        if (!objectId) {
            res.status(400).json({ error: "Invalid objectId: objectId is undefined or null" });
            return; // Ensure no further code is executed
        }

        // Fetch enterprise_id and hubspot_owner_id from HubSpot
        const url = `https://api.hubapi.com/crm/v3/objects/contacts/${objectId}?properties=enterprise_id,hubspot_owner_id`;
        console.log("HubSpot API URL:", url);

        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}` },
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error("Error fetching lead:", errorDetails);
            res.status(response.status).json({ error: "Error fetching lead", details: errorDetails });
            return; // Ensure no further code is executed
        }

        const lead = await response.json();
        const enterprise_id = lead?.properties?.enterprise_id;
        const hubspot_owner_id = lead?.properties?.hubspot_owner_id;

        if (!hubspot_owner_id) {
            res.status(400).json({ error: "Invalid hubspot_owner_id: hubspot_owner_id is undefined or null" });
            return; // Ensure no further code is executed
        }

        // Fetch owner details
        const ownerURL = `https://api.hubapi.com/crm/v3/owners/${hubspot_owner_id}`;
        console.log("Owner URL:", ownerURL);

        let owner_id;
        try {
            const ownerResponse = await axios.get(ownerURL, {
                headers: { "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}` },
            });
            const owner_email = ownerResponse?.data?.email;

            const { data, error } = await supabase
                .from("users_details")
                .select("user_id")
                .eq("email", owner_email);

            if (error) {
                console.error("Error fetching owner data:", error);
                res.status(500).json({ error: "Error fetching owner data", details: error.message });
                return; // Ensure no further code is executed
            }

            owner_id = data[0]?.user_id;
        } catch (error) {
            console.error("Error fetching owner details:", error.message);
            res.status(500).json({ error: "Error fetching owner details", details: error.message });
            return; // Ensure no further code is executed
        }

        // Fetch selected fields for the enterprise
        const { data: selectedFieldsData, error: selectedFieldsError } = await supabase
            .from("enterprise_lead_config")
            .select("selected_fields")
            .eq("enterprise_id", enterprise_id);

        if (selectedFieldsError) {
            console.error("Error fetching selected fields:", selectedFieldsError);
            res.status(500).json({ error: "Error fetching selected fields", details: selectedFieldsError.message });
            return; // Ensure no further code is executed
        }

        if (selectedFieldsData.length === 0) {
            res.status(404).json({ error: "No selected fields found for the given enterprise ID" });
            return; // Ensure no further code is executed
        }

        const selectedFields = JSON.parse(selectedFieldsData[0].selected_fields)
            .filter((field) => field.selected)
            .map((field) => field.name);

        console.log("Selected fields:", selectedFields);

        // Fetch data for the selected fields from HubSpot
        const fieldUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${objectId}?properties=${selectedFields.join(",")}`;
        const fieldResponse = await fetch(fieldUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}` },
        });

        if (!fieldResponse.ok) {
            const errorDetails = await fieldResponse.text();
            console.error("Error fetching selected fields data:", errorDetails);
            res.status(fieldResponse.status).json({ error: "Error fetching selected fields data", details: errorDetails });
            return; // Ensure no further code is executed
        }

        const fieldData = await fieldResponse.json();
        console.log("Field data:", fieldData);

        // Insert the data into the lead_details table
        const { error: insertError } = await supabase
            .from("enterprise_lead_details")
            .insert({
                enterprise_id,
                custom_lead_data: fieldData?.properties,
                assigned_to: owner_id,
            });

        if (insertError) {
            console.error("Error inserting lead details:", insertError.message);
            res.status(500).json({ error: "Error inserting lead details", details: insertError.message });
            return; // Ensure no further code is executed
        }

        console.log("Lead details inserted successfully");
        res.status(200).json({ message: "Lead details processed successfully", lead });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export default getCreatedLead;