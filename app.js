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

// Pass requests to the router
app.use('/api', router);

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Hello World!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});