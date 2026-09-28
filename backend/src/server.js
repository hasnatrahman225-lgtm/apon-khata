require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const contactsRoutes = require("./routes/contacts");
const transactionsRoutes = require("./routes/transactions");
const stockRoutes = require("./routes/stock");
const dashboardRoutes = require("./routes/dashboard");
const reportsRoutes = require("./routes/reports");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, service: "khatabook-backend" }));

app.use("/auth", authRoutes);
app.use("/contacts", contactsRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/stock", stockRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/reports", reportsRoutes);

// Serve frontend static build if present (for single-server deployment)
const path = require("path");
const fs = require("fs");
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    // If it's an API route or file asset request, pass along
    if (
      req.path.startsWith("/auth") ||
      req.path.startsWith("/contacts") ||
      req.path.startsWith("/transactions") ||
      req.path.startsWith("/reports") ||
      req.path.startsWith("/stock") ||
      req.path.startsWith("/dashboard") ||
      req.path.includes(".")
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`khatabook backend running on http://0.0.0.0:${PORT}`);
});
