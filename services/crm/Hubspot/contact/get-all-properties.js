import axios from "axios";
import supabase from "../../../../config/supabase.js";
const getAllProperties = async ({enterprise_ID}) => {
    try {
        const enterprise_id = enterprise_ID;
        if (!enterprise_id) {
            throw new Error("Invalid enterprise ID");
        }
        console.log('enterprise_id from getAllProperties', enterprise_id);
        
        let properties = [];
        const url = `${process.env.HUBSPOT_URL}/properties/contacts`;
        const headers = {
            'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        };

        const response = await axios.get(url, { headers });
        if (!response || !response.data || !response.data.results) {
            throw new Error("Invalid response from HubSpot API");
        }
        console.log(response);

        const result = response.data.results;
        console.log(result);

        result.map((field) => {
            
            properties.push({
                name: field.name,
                label: field.label,
                type: field.type,
                selected: false           })
        });

        if (properties.length === 0) {
            throw new Error("No properties found to insert");
        }

        console.log(properties);
        console.log('Size of properties object:', JSON.stringify(properties).length);

        // Validate JSON structure
        try {
            JSON.stringify(properties);
        } catch (err) {
            console.error("Invalid JSON structure:", err);
            throw new Error("Invalid JSON structure");
        }

        const {data, error} = await supabase.from('enterprise_lead_config').upsert({
            enterprise_id: enterprise_id,
            total_fields:  JSON.stringify(properties),
            
        })
        if (error) {
            console.log("Error inserting data:", error.message, error.details);
            throw new Error("Error inserting data");
        }
        console.log("Data inserted successfully", data);
        return {
            status: 200,
            message: "Properties fetched successfully",
            data: properties,
        };
    }
    catch (error) {
        console.log("Error getting the properties", error);
        throw new Error("Error getting the properties");
    }
}

export default getAllProperties;