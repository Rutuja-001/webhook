require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

/* ================================
   1️⃣ WEBHOOK VERIFICATION (GET)
================================ */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

/* ================================
   2️⃣ MAIN WEBHOOK RECEIVER (POST)
================================ */
app.post("/webhook", (req, res) => {
  const body = req.body;

  console.log("📩 Incoming Webhook:");
  console.log(JSON.stringify(body, null, 2));

  if (body.object) {
    body.entry?.forEach((entry) => {
      entry.changes?.forEach((change) => {

        const value = change.value;

        /* ===========================
           📨 NORMAL MESSAGES
        =========================== */
        if (value.messages) {
          const message = value.messages[0];
          const from = message.from;

          console.log("💬 Message from:", from);
          console.log("📌 Message type:", message.type);

          /* ===========================
             🔥 FLOW RESPONSE
          =========================== */
          if (message.type === "interactive") {
            const interactive = message.interactive;

            // Flow reply
            if (interactive.type === "nfm_reply") {
              console.log("🚀 FLOW RESPONSE RECEIVED");

              const flowData = interactive.nfm_reply?.response_json;

              console.log("📋 Flow Data:");
              console.log(flowData);

              /*
                 Example flowData:
                 {
                   services: ["Facial", "Hair Spa"],
                   time_slot: "4PM - 5PM"
                 }
              */

              console.log("✅ Selected Services:", flowData?.services);
              console.log("⏰ Selected Time:", flowData?.time_slot);

              // 👉 HERE you can:
              // - Save to database
              // - Send email
              // - Call CRM
            }
          }
        }

        /* ===========================
           📢 TEMPLATE STATUS UPDATE
        =========================== */
        if (change.field === "message_template_status_update") {
          console.log("📊 Template Status Update:");
          console.log(value);
        }

        /* ===========================
           📦 MESSAGE DELIVERY STATUS
        =========================== */
        if (value.statuses) {
          value.statuses.forEach((status) => {
            console.log("📨 Message Status Update:");
            console.log("To:", status.recipient_id);
            console.log("Status:", status.status);
          });
        }

      });
    });

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
});

/* ================================
   🚀 START SERVER
================================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("==================================");
  console.log("🚀 Webhook Server Running");
  console.log(`🔗 http://localhost:${PORT}/webhook`);
  console.log("==================================");
});