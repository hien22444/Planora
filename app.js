require('dotenv').config();
const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const connectDB = require("./config/database");
const { loadUser } = require("./middleware/auth");

// Kết nối database
connectDB();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

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

// Test redirect
app.get("/test", (req, res) => {
  res.render('test-redirect', { user: req.user });
});

// Test all pages
app.get('/test-all', (req, res) => {
  res.render('test-all', { user: req.user });
});

// Test email
app.get("/test-email", (req, res) => {
  res.render('test-email');
});

// Test guide
app.get("/test-guide", (req, res) => {
  res.render('test-guide');
});

// Debug page
app.get("/debug", (req, res) => {
  res.render('debug', { user: req.user });
});

// Test customer pages
app.get("/test-customer", (req, res) => {
  res.render('test-customer');
});

app.post("/test-email", async (req, res) => {
  try {
    const { email, token } = req.body;
    const { sendVerificationEmail } = require('./services/emailService');
    
    const result = await sendVerificationEmail(email, token);
    res.json({ success: result, message: result ? 'Email sent successfully!' : 'Failed to send email' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Trang chủ → redirect theo role hoặc trang chủ
// Home route
app.get('/', (req, res) => {
  console.log('=== HOME PAGE DEBUG ===');
  console.log('User:', req.user ? req.user.fullName : 'Not logged in');
  console.log('Role:', req.user ? req.user.role : 'No role');
  
  if (req.user) {
    if (req.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (req.user.role === 'customer') {
      return res.redirect('/customer/dashboard');
    }
  }
  res.redirect('/auth/login');
});

// Legacy route redirects
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/register', (req, res) => res.redirect('/auth/register'));
app.post('/login', (req, res) => res.redirect('/auth/login'));
app.post('/register', (req, res) => res.redirect('/auth/register'));
app.post('/logout', (req, res) => res.redirect('/auth/logout'));

// Auth routes
app.use("/auth", authRoutes);

// Customer routes
app.use("/customer", customerRoutes);

// Admin routes
app.use("/admin", adminRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
