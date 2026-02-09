require("dotenv").config();
const express = require("express");
const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
app.use(express.json());

// ✅ Save Excel in project root
const FILE_PATH = path.join(__dirname, "bookings.xlsx");

/* ======================================
   1️⃣ WEBHOOK VERIFICATION (GET)
====================================== */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* ======================================
   2️⃣ SAVE TO EXCEL FUNCTION
====================================== */
function saveToExcel(phone, services, timeSlot) {
  let data = [];

  if (fs.existsSync(FILE_PATH)) {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json(sheet);
  }

  data.push({
    Phone: phone,
    Services: Array.isArray(services) ? services.join(", ") : (services || ""),
    TimeSlot: timeSlot || "",
    Date: new Date().toLocaleString(),
  });

  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Bookings");
  XLSX.writeFile(newWorkbook, FILE_PATH);

  console.log("📊 Booking saved to Excel:", FILE_PATH);
}

/* ======================================
   3️⃣ EXTRACT FLOW DATA (YOUR KEYS)
====================================== */
function extractBookingFromFlow(flowData) {
  // ✅ These keys match your webhook log
  const services = [
    ...(flowData["screen_0_SKIN_0"] || []),
    ...(flowData["screen_0__HAIR_1"] || []),
    ...(flowData["screen_0__MAKEUP_2"] || []),
    ...(flowData["screen_0__NAILS_3"] || []),
  ];

  const timeSlot =
    (flowData["screen_1_Choose__preferred_time_slot_0"] || [])[0];

  return { services, timeSlot };
}

/* ======================================
   4️⃣ HANDLE BOOKING
====================================== */
function handleBooking(phone, flowData) {
  const { services, timeSlot } = extractBookingFromFlow(flowData);

  console.log("📌 New Booking Received");
  console.log("Phone:", phone);
  console.log("✅ Selected Services:", services);
  console.log("⏰ Selected Time:", timeSlot);

  saveToExcel(phone, services, timeSlot);
}

/* ======================================
   5️⃣ MAIN WEBHOOK RECEIVER (POST)
====================================== */
app.post("/webhook", (req, res) => {
  try {
    const body = req.body;

    console.log("📩 Incoming Webhook:");
    console.log(JSON.stringify(body, null, 2));

    if (!body.object) return res.sendStatus(404);

    body.entry?.forEach((entry) => {
      entry.changes?.forEach((change) => {
        const value = change.value;

        // ✅ Incoming messages (Flow response etc.)
        if (value.messages?.length) {
          const message = value.messages[0];

          console.log("💬 Message from:", message.from);
          console.log("📌 Message type:", message.type);

          // ✅ WhatsApp Flow Response
          if (
            message.type === "interactive" &&
            message.interactive?.type === "nfm_reply"
          ) {
            console.log("🚀 FLOW RESPONSE RECEIVED");

            // ✅ FIX: response_json is STRING → parse to object
            const flowData = JSON.parse(
              message.interactive?.nfm_reply?.response_json || "{}"
            );

            console.log("📋 Flow Data:", flowData);

            handleBooking(message.from, flowData);
          }
        }

        // ✅ Delivery statuses
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
    console.error("❌ Webhook Error:", err);
    return res.sendStatus(500);
  }
});

/* ======================================
   6️⃣ DOWNLOAD EXCEL ROUTE
====================================== */
app.get("/download-excel", (req, res) => {
  if (!fs.existsSync(FILE_PATH)) {
    return res.status(404).send("No bookings available yet.");
  }

  res.download(FILE_PATH, "Salon_Bookings.xlsx", (err) => {
    if (err) {
      console.error("❌ Download error:", err);
      res.status(500).send("Error downloading file.");
    }
  });
});

/* ======================================
   🚀 START SERVER
====================================== */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("==================================");
  console.log("🚀 Webhook Server Running");
  console.log(`🔗 http://localhost:${PORT}/webhook`);
  console.log(`📥 Download: /download-excel`);
  console.log("==================================");
});
