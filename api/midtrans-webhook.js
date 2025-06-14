import { db } from "../config/firebase";

export const config = {
  api: {
    bodyParser: true, // default true: json support
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const notification = req.body;
    console.log("📬 Webhook received:", notification);

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
    } = notification;

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
        notification_data: notification,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`✅ Transaction ${order_id} status updated.`);
    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res
      .status(500)
      .json({ error: "Failed to process webhook", message: error.message });
  }
}
