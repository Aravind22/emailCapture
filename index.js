const express = require("express")
require("dotenv").config()
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const app = express()
const cors = require('cors');

const MongoClient = require('mongodb').MongoClient;
const DB_PATH = process.env.MONGO_URI
const PORT = process.env.PORT

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many requests from this IP, please try again later.',
});

app.use(express.json())
app.use(bodyParser.json());
app.use(cors());
app.use(limiter);

app.post('/enroll', async (req, res) => {
    const userEmail = req.body.email;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (emailRegex.test(userEmail)) {
        const client = new MongoClient(DB_PATH);
        try {
            await client.connect();
            const db = client.db();
            const collection = db.collection('cookzyMailingList');
            const existingEmail = await collection.findOne({ email: userEmail });
            if (existingEmail) {
                res.status(401).json({ message: 'Email address already subscribed' });
            } else {
                await collection.insertOne({ email: userEmail });
                res.status(200).json({ message: 'Subscription successful' });
            }
        } catch (err) {
            console.log(err)
            res.status(500).json({ message: "Error in enrolling, please try again later" })
        } finally {
            await client.close();
        }
    } else {
        res.status(400).json({ message: 'Invalid email address' });
    }
})

app.listen(PORT, (err) => {
    if (!err) {
        console.log(`Server started at ${PORT} and running...`)
    } else {
        console.log("Error in starting server:: ", err)
    }
})