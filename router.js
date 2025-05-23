import authRouter from "./router/auth.js";
import express from "express";
import crmRouter from "./router/crm.js";
import coreRouter from "./router/core.js";
import axios from "axios";
import supabase from "./config/supabase.js";
const router = express.Router();

router.use("/auth", authRouter);

router.use("/crm", crmRouter);
router.use("/core", coreRouter);

router.get('/oauth2callback', async (req, res) => {
   
    const code = req.query.code;
    const userId = req.query.state;
    console.log('This is the user giving acces to gmail: ', userId);
    
    // Exchange code for tokens
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', process.env.GOOGLE_CLIENT_ID);
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
    params.append('redirect_uri', 'https://revupp-backend.onrender.com/api/oauth2callback');
    params.append('grant_type', 'authorization_code');

    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        // tokenRes.data contains access_token, refresh_token, etc.
        console.log('tokenRes.data', tokenRes.data);
        const tokenData = tokenRes?.data;
        const refresh_token = tokenData?.refresh_token;
        const access_token = tokenData?.access_token;
        const {data, error} = await supabase.from('enterprise_user_oauth_token').insert({refresh_token: refresh_token, access_token: access_token, use_id: userId})
        if( error){
            console.log("Error storing gmail token: ", error);
        }
        return res.redirect(`${process.env.fronFRONTEND_URL}/settings`);
    } catch (err) {
        res.status(500).json({ error: 'Token exchange failed', details: err.response.data });
    }
});
export default router;