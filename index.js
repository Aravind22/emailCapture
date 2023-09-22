const express = require("express");
require("dotenv").config();
const path = require("path");
const ejs = require("ejs");
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const app = express();
const cors = require('cors');
const nodemailer = require("nodemailer")

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
app.use(express.static("public"));

app.set("view engine", "ejs");

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
});

app.get("/", (req, res) => {
    res.send("Cookzy - Online")
})

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
                res.status(401).json({ message: 'Email address already joined' });
            } else {
                await collection.insertOne({ email: userEmail });
                ejs
                    .renderFile(path.join(__dirname, 'Assets', 'thank_you.ejs'),
                        {
                            survey_link: "https://forms.gle/VsNrEp3wEjJAeyer6"
                        })
                    .then(result => {
                        emailTemplate = result;
                        let mailOptions = {
                            from: "cookzy.help@gmail.com",
                            to: userEmail,
                            subject: "You're on the List! Let's Cook Up Something Special",
                            html: emailTemplate
                        };
                        transporter.sendMail(mailOptions, function (err, data) {
                            if (err) {
                                console.log("Error " + err);
                            } else {
                                console.log(`Email sent to ${userEmail} successfully`);
                            }
                        });
                    })
                    .catch(err => {
                        res.status(400).json({
                            message: "Error Rendering emailTemplate",
                            error: err
                        });
                    });
                res.status(200).json({ message: 'Successfully joined the waitlist' });
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