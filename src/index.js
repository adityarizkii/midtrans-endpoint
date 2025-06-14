require("dotenv").config();
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");
const { db } = require("./config/firebase");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create Snap token endpoint
app.post("/snap-token", async (req, res) => {
  try {
    const { order_id, amount, customer_details } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "order_id and amount are required",
      });
    }

    const params = {
      transaction_details: {
        order_id,
        gross_amount: amount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: customer_details || {},
    };

    const { token } = await snap.createTransaction(params);
    res.json({ token });
  } catch (error) {
    console.error("Error creating Snap token:", error);
    res.status(500).json({
      error: "Failed to create transaction",
      message: error.message,
    });
  }
});

// Webhook handler
app.post("/midtrans-webhook", express.json(), async (req, res) => {
  try {
    const notificationJson = req.body;
    console.log("Webhook received:", notificationJson);

    const orderId = notificationJson.order_id;
    const transactionStatus = notificationJson.transaction_status;
    const paymentType = notificationJson.payment_type;
    const grossAmount = notificationJson.gross_amount;
    const transactionTime = notificationJson.transaction_time;

    // Simpan data ke Firestore
    await db.collection("transaction").doc(orderId).set(
      {
        order_id: orderId,
        transaction_status: transactionStatus,
        payment_type: paymentType,
        gross_amount: grossAmount,
        transaction_time: transactionTime,
        notification_data: notificationJson,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log untuk monitoring
    console.log(
      `Transaction ${orderId} status updated to ${transactionStatus}`
    );

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      error: "Failed to process webhook",
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
