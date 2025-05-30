import supabase from "../../../config/supabase.js";
import client from "../../../config/openai.js";
import axios from "axios";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

const verifylead = async (data) => {
    try {
        const { enterprise_id, custom_lead_data, id } = data;

        // Fetch qualification_config from the database
        const { data: qualificationData, error } = await supabase
            .from('enterprise_lead_qualification_config')
            .select('qualification_config')
            .eq('enterprise_id', enterprise_id).single();

        if (error || !qualificationData) {
            throw new Error("Error fetching qualification config");
        }

        const qualification_config = qualificationData.qualification_config;

        const prompt = `Evaluate the following lead data based on the qualification configuration:\n\n` +
            `Qualification Configuration: these are the requirements ${JSON.stringify(qualification_config)}\n\n` +
            `Lead Data: ${JSON.stringify(custom_lead_data)}\n\n` +
            `Provide a detailed evaluation and whether the lead qualifies or not. eply in QUALIFIED or UNQUALIFIED only`;

        // const response = await client.responses.create({
        //     model: "gpt-4.1-nano",
        //     instructions: "You are an expert lead evaluator. reply in QUALIFIED or UNQUALIFIED only",
        //     input: prompt
        // });

        const response = {output_text:'UNQUALIFIED' }

        const evaluation = response?.output_text;
        console.log("Updating status for ID:", id, "with evaluation:", evaluation);

        // Fetch AE assignment config
        const { data: aeData, error: aeError } = await supabase
            .from("enterprise_assignment_config")
            .select("config")
            .eq("enterprise_id", enterprise_id)
            .single();

        if (aeError || !aeData?.config?.ae_ids?.length) {
            throw new Error("No AE list found for assignment");
        }

        // Fetch or initialize last assigned index
        const { data: trackerData, error: trackerError } = await supabase
            .from("enterprise_ae_assignment_tracker")
            .select("last_assigned_ae_id")
            .eq("enterprise_id", enterprise_id)
            .single();

        const aeList = aeData?.config?.ae_ids;
        let currentIndex = trackerData ? aeList.findIndex(ae => ae === trackerData.last_assigned_ae_id) : -1;
        const nextIndex = (currentIndex + 1) % aeList.length;
        const assignedAeId = aeList[nextIndex];

        // Update assignment_tracker
        await supabase
            .from("assignment_tracker")
            .upsert({
                enterprise_id,
                last_assigned_ae_id: assignedAeId,
                updated_at: new Date().toISOString()
            });

        // Get AE email from user table
        const { data: aeUser, error: aeUserError } = await supabase
            .from("users_details")
            .select("email")
            .eq("user_id", assignedAeId)
            .single();

        const aeEmail = aeUser?.email;
        if (!aeEmail) throw new Error("AE email not found");

        // Update lead details with AE assignment and evaluation status
        const { error: updateError } = await supabase
            .from('enterprise_lead_details')
            .update({ status: evaluation, assigned_to: assignedAeId })
            .eq('id', id);

        if (updateError) {
            console.error("Error updating lead details:", updateError.message);
        } else {
            console.log("Lead status and assignment updated for ID:", id);
        }

        // Update HubSpot contact owner
        const ownerResp = await axios.get(`https://api.hubapi.com/crm/v3/owners?email=${aeEmail}`, {
            headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` },
        });

        const owner = ownerResp.data?.results?.find(o => o.email === aeEmail);
        console.log("Data checked");
        
        if (!owner) throw new Error("HubSpot owner not found");

        const contactSearch = await axios.post(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
            filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: custom_lead_data.email }] }],
            properties: ["email"],
            limit: 1,
        }, {
            headers: {
                Authorization: `Bearer ${HUBSPOT_API_KEY}`,
                "Content-Type": "application/json"
            },
        });

        const contact = contactSearch.data.results?.[0];
        if (!contact) throw new Error("HubSpot contact not found");

        await axios.patch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`,
            { properties: { hubspot_owner_id: owner.id } },
            {
                headers: {
                    Authorization: `Bearer ${HUBSPOT_API_KEY}`,
                    "Content-Type": "application/json"
                },
            }
        );

        return {
            status: "success",
            evaluation,
            assigned_to: aeEmail,
        };
    } catch (error) {
        console.error("Error in verify lead:", error);
        throw new Error("Error in verify lead");
    }
};

export default verifylead;
