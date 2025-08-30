
// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const app = express();
const port = process.env.PORT || 4000;

// --- Middlewares ---
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://ebissamideksa.github.io"
  ],
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ DB Connection error:", err));

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// --- Multer (temporary storage before Cloudinary) ---
const upload = multer({ dest: "uploads/" });

// --- Models ---
const productSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true, set: v => v.trim().toLowerCase() },
  old_price: { type: Number, required: true },
  new_price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true }
});
const Product = mongoose.model("Product", productSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  CartData: { type: Object, default: {} },
  date: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// --- Middleware: fetch user from token ---
const fetchUser = (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) return res.status(401).json({ error: "Please authenticate" });

  try {
    const verified = jwt.verify(token, "secret_ecom");
    req.user = verified.user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Routes ---

// Health check
app.get("/", (req, res) => res.send("🚀 Backend is live!"));

// Debug ENV (for Railway testing)
app.get("/debug-env", (req, res) => {
  res.json({
    PORT: process.env.PORT,
    MONGO_URI: !!process.env.MONGO_URI,
    CLOUD_NAME: !!process.env.CLOUD_NAME,
    CLOUD_API_KEY: !!process.env.CLOUD_API_KEY,
    CLOUD_API_SECRET: !!process.env.CLOUD_API_SECRET
  });
});

// Upload product image -> Cloudinary
app.post("/upload", upload.single("product"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products"
    });
    res.json({ success: true, imageUrl: result.secure_url });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Add Product
app.post("/addproduct", async (req, res) => {
  try {
    const products = await Product.find({});
    const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({ ...req.body, id });
    await product.save();

    res.json({ success: true, name: req.body.name });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add product" });
  }
});

// Delete Product
app.delete("/deleteproduct/:id", async (req, res) => {
  await Product.findOneAndDelete({ id: req.params.id });
  res.json({ success: true, id: req.params.id });
});

// Get All Products
app.get("/all_products", async (req, res) => {
  const products = await Product.find({});
  res.json({ success: true, products });
});

// New Collection
app.get("/newcollection", async (req, res) => {
  const products = await Product.find({});
  res.json(products.slice(-10));
});

// Popular Women
app.get("/popularwomen", async (req, res) => {
  const products = await Product.find({ category: "women" });
  res.json(products.slice(0, 6));
});

// Signup
app.post("/signup", async (req, res) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return res.status(400).json({ success: false, message: "User already exists" });

  let cart = {};
  for (let i = 0; i <= 300; i++) cart[i] = 0;

  const user = new User({ ...req.body, CartData: cart });
  await user.save();

  const token = jwt.sign({ user: { id: user.id } }, "secret_ecom");
  res.json({ success: true, token, name: user.name });
});

// Login
app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ success: false, message: "Invalid email" });

  if (req.body.password !== user.password) {
    return res.json({ success: false, message: "Wrong password" });
  }

  const token = jwt.sign({ user: { id: user.id } }, "secret_ecom", { expiresIn: "1h" });
  res.json({ success: true, token, name: user.name });
});

// Cart Endpoints
app.post("/addtocart", fetchUser, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.CartData[req.body.itemId] += 1;
  await user.save();
  res.json({ success: true });
});

app.post("/removefromcart", fetchUser, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.CartData[req.body.itemId] = 0;
  await user.save();
  res.json({ success: true });
});

app.post("/getcartdata", fetchUser, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, cartData: user.CartData });
});

// Delete User
app.delete("/user/:id", fetchUser, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- Start Server ---
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
