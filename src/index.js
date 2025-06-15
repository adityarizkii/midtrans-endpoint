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
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Initialize Midtrans Core API
const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("health check");
  res.json({ status: "ok" });
});

// Check transaction status endpoint
app.get("/check/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Hit Midtrans API menggunakan Core API
    const response = await core.transaction.status(orderId);

    // Hanya simpan ke Firestore jika status settlement
    if (response.transaction_status === "settlement") {
      await db
        .collection("transaction")
        .doc(orderId)
        .set({
          ...response,
          updated_at: new Date().toISOString(),
        });
    }

    res.json(response);
  } catch (error) {
    console.error("Error checking transaction status:", error);
    res.status(500).json({
      error: "Failed to check transaction status",
      message: error.message,
    });
  }
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

    const {
      order_id,
      transaction_status,
      payment_type,
      gross_amount,
      transaction_time,
      transaction_id,
      settlement_time,
      va_numbers,
      fraud_status,
      currency,
      expiry_time,
    } = notificationJson;

    // Simpan data ke Firestore
    await db.collection("transaction").doc(order_id).set(
      {
        order_id,
        transaction_id,
        transaction_status,
        payment_type,
        gross_amount,
        transaction_time,
        settlement_time,
        va_numbers,
        fraud_status,
        currency,
        expiry_time,
        notification_data: notificationJson,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log untuk monitoring
    console.log(
      `Transaction ${order_id} status updated to ${transaction_status}`
    );

    // Kirim response dengan data transaksi
    res.status(200).json({
      order_id,
      transaction_id,
      transaction_status,
      payment_type,
      gross_amount,
      transaction_time,
      settlement_time,
      va_numbers,
      fraud_status,
      currency,
      expiry_time,
    });
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
