require('dotenv').config();
const express = require("express");
const app = express();

// IMPORTANT: webhook usually needs raw JSON
app.use(express.json());

// 1. Basic Webhook Example
app.post("/webhook", (req, res) => {
    const headers = req.headers;
    const body = req.body;

    console.log("--- Basic Webhook Received ---");
    console.log("Webhook Headers:", headers);
    console.log("Webhook Body:", body);

    // Always respond quickly
    res.status(200).send("Webhook received");
});

// 2. Secure Webhook Example
app.post("/webhook-secure", (req, res) => {
    const signature = req.headers["x-webhook-signature"];
    const SECRET = process.env.WEBHOOK_SECRET || "fallback_secret";

    console.log("--- Secure Webhook Attempt ---");

    if (signature !== SECRET) {
        console.log("Invalid signature received");
        return res.status(401).send("Invalid signature");
    }

    console.log("Verified webhook:", req.body);
    res.status(200).send("Verified Webhook received");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook server running on http://localhost:${PORT}`);
    console.log(`Basic Webhook URI: http://localhost:${PORT}/webhook`);
    console.log(`Secure Webhook URI: http://localhost:${PORT}/webhook-secure`);
});
