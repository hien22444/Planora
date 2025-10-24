require("dotenv").config();
const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const connectDB = require("./config/database");
const { loadUser } = require("./middleware/auth");
const multer = require("multer");
const fs = require("fs");
const uploadDir = path.join(__dirname, "public", "uploads");

const app = express();

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config: store files under public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Keep original extension
    const original = file.originalname || "file";
    const ext = path.extname(original);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Apply multer to parse multipart/form-data for uploads globally (only parses and attaches files)
app.use((req, res, next) => {
  upload.fields([{ name: "images" }, { name: "video", maxCount: 1 }])(
    req,
    res,
    (err) => {
      // ignore multer errors here; controllers will handle validation
      return next();
    }
  );
});

// Kết nối database
connectDB();
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-here",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// Flash messages
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// EJS + Layouts
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main"); // layout mặc định

// Load user middleware
app.use(loadUser);

// Routes
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const serviceRoutes = require("./routes/service");
const categoryRoutes = require("./routes/categoryRoutes");
// Test redirect
app.get("/test", (req, res) => {
  res.render("test-redirect", { user: req.user });
});

// Test all pages
app.get("/test-all", (req, res) => {
  res.render("test-all", { user: req.user });
});

// Test email
app.get("/test-email", (req, res) => {
  res.render("test-email");
});

// Test guide
app.get("/test-guide", (req, res) => {
  res.render("test-guide");
});

// Debug page
app.get("/debug", (req, res) => {
  res.render("debug", { user: req.user });
});

// Test customer pages
app.get("/test-customer", (req, res) => {
  res.render("test-customer");
});

app.post("/test-email", async (req, res) => {
  try {
    const { email, token } = req.body;
    const { sendVerificationEmail } = require("./services/emailService");

    const result = await sendVerificationEmail(email, token);
    res.json({
      success: result,
      message: result ? "Email sent successfully!" : "Failed to send email",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Trang chủ → redirect theo role hoặc trang chủ
// Home route
app.get("/", (req, res) => {
  console.log("=== HOME PAGE DEBUG ===");
  console.log("User:", req.user ? req.user.fullName : "Not logged in");
  console.log("Role:", req.user ? req.user.role : "No role");

  if (req.user) {
    if (req.user.role === "admin") {
      return res.redirect("/admin/dashboard");
    } else if (req.user.role === "customer" || req.user.role === "shop") {
      return res.redirect("/customer/dashboard");
    }
  }
  // Redirect đến customer/dashboard thay vì login page
  res.redirect("/customer/dashboard");
});

// Legacy route redirects
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/register', (req, res) => res.redirect('/auth/register'));
app.get('/verify-email', (req, res) => res.redirect('/auth/verify-email' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '')));
app.get('/forgot-password', (req, res) => res.redirect('/auth/forgot-password'));
app.get('/reset-password', (req, res) => res.redirect('/auth/reset-password' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '')));
app.post('/login', (req, res) => res.redirect('/auth/login'));
app.post('/register', (req, res) => res.redirect('/auth/register'));
app.post('/logout', (req, res) => res.redirect('/auth/logout'));

// Auth routes
app.use("/auth", authRoutes);

// Customer routes
app.use("/customer", customerRoutes);

// Admin routes
app.use("/admin", adminRoutes);
// Service routes
app.use("/services", serviceRoutes);
// Category routes
app.use("/categories", categoryRoutes);
// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
