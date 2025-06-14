export default function handler(req, res) {
  console.log("health check");
  res.status(200).json({ status: "ok" });
}
