import supabase from "../../../config/supabase.js";
import client from "../../../config/openai.js";

const verifylead = async (data) => {
    try {
        const { enterprise_id, custom_lead_data, id } = data;

        // Fetch qualification_config from the database
        const { data: qualificationData, error } = await supabase
            .from('enterprise_lead_qualification_config')
            .select('qualification_config')
            .eq('enterprise_id', enterprise_id).single();

        if (error) {
            throw new Error("Error fetching lead data");
        }

        if (qualificationData.length === 0) {
            throw new Error("No lead data found for the given enterprise ID");
        }

        const leadData = qualificationData?.qualification_config[0];
        const qualification_config = (leadData);

        // Prepare the prompt for OpenAI
        const prompt = `Evaluate the following lead data based on the qualification configuration:\n\n` +
            `Qualification Configuration:  these are the requirements ${JSON.stringify(qualification_config)}\n\n` +
            `Lead Data: ${JSON.stringify(custom_lead_data)}\n\n` +
            `Provide a detailed evaluation and whether the lead qualifies or not.`;

        // Use OpenAI to evaluate the lead
        const response = await client.responses.create({
            model: "gpt-4.1-nano",
            instructions: "You are an expert lead evaluator. reply in QUALIFIED or not UNQUALIFIED only",
            input: prompt
        });

        const evaluation = response?.output_text;
        console.log("Updating status for ID:", id, "with evaluation:", evaluation);

        const { error: updateError } = await supabase
            .from('enterprise_lead_details')
            .update({ status: evaluation }) // Pass the value as an object
            .eq('id', id);

        if (updateError) {
            console.error("Error updating the status in the enterprise lead details:", updateError.message);
        } else {
            console.log("Status updated successfully for ID:", id);
        }

        return {
            status: "success",
            evaluation,
        };
    } catch (error) {
        console.error("Error in verify lead:", error);
        throw new Error("Error in verify lead");
    }
};

export default verifylead;