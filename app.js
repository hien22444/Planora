const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// EJS + Layouts
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/admin"); // layout mặc định

// Routes
const adminRoutes = require("./routes/adminRoutes");

// Trang chủ → redirect vào dashboard
app.get("/", (req, res) => {
  res.redirect("/admin/dashboard");
});

// Admin routes
app.use("/admin", adminRoutes);

// Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
