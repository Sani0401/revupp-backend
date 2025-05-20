import express from 'express';
import router from './router.js';
import dotenv from 'dotenv';
import cors from 'cors'; // Import the cors package

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/api/oauth2callback', async (req, res) => {
    const code = req.query.code;

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
        
        res.json(tokenRes.data);
    } catch (err) {
        res.status(500).json({ error: 'Token exchange failed', details: err.response.data });
    }
});

// Pass requests to the router
app.use('/api', router);

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Hello World!' });
});




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});