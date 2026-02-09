require("dotenv").config();
const express = require("express");
const fs = require("fs");
const XLSX = require("xlsx");

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
   ✅ SAVE TO EXCEL
================================ */
function saveToExcel(phone, services, timeSlot) {
  const filePath = "bookings.xlsx";
  let data = [];

  if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json(sheet);
  }

  data.push({
    Phone: phone,
    Services: Array.isArray(services) ? services.join(", ") : services,
    TimeSlot: timeSlot,
    Date: new Date().toLocaleString(),
  });

  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Bookings");
  XLSX.writeFile(newWorkbook, filePath);
}

/* ================================
   ✅ HANDLE BOOKING
================================ */
function handleBooking(phone, flowData) {
  console.log("📌 New Booking");
  console.log("Phone:", phone);
  console.log("Services:", flowData?.services);
  console.log("Time Slot:", flowData?.time_slot);

  saveToExcel(phone, flowData?.services, flowData?.time_slot);
  console.log("📊 Saved to bookings.xlsx ✅");
}

/* ================================
   2️⃣ MAIN WEBHOOK RECEIVER (POST)
================================ */
app.post("/webhook", (req, res) => {
  try {
    const body = req.body;

    console.log("📩 Incoming Webhook:");
    console.log(JSON.stringify(body, null, 2));

    if (!body.object) return res.sendStatus(404);

    body.entry?.forEach((entry) => {
      entry.changes?.forEach((change) => {
        const value = change.value;

        /* ===========================
           📨 NORMAL MESSAGES + FLOW
        =========================== */
        if (value.messages?.length) {
          const message = value.messages[0];

          console.log("💬 Message from:", message.from);
          console.log("📌 Message type:", message.type);

          // ✅ FLOW RESPONSE
          if (
            message.type === "interactive" &&
            message.interactive?.type === "nfm_reply"
          ) {
            console.log("🚀 FLOW RESPONSE RECEIVED");

            const flowData = message.interactive.nfm_reply?.response_json;

            console.log("📋 Flow Data:", flowData);

            handleBooking(message.from, flowData);
          }
        }

        /* ===========================
           📢 TEMPLATE STATUS UPDATE
        =========================== */
        if (change.field === "message_template_status_update") {
          console.log("📊 Template Status Update:", value);
        }

        /* ===========================
           📦 MESSAGE DELIVERY STATUS
        =========================== */
        if (value.statuses?.length) {
          value.statuses.forEach((status) => {
            console.log("📨 Message Status Update:");
            console.log("To:", status.recipient_id);
            console.log("Status:", status.status);
          });
        }
      });
    });

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.sendStatus(500);
  }
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
