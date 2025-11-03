const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs"); // for password hashing
const jwt = require("jsonwebtoken"); // for token generation
const crypto = require("crypto"); // built-in module
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "AbesEngineeringCollege"; // secret for token

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // check existence
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // password hash
    const hashed = await bcrypt.hash(password, 10);

    // user created
    const newUser = new User({ name, email, password: hashed, role });

    // user saved
    await newUser.save();

    // response
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check existence
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // token generation
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate resetToken
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Build password reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: `"Auth System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click below to reset your password. This link will expire in 10 minutes.</p>
        <a href="${resetLink}" style="color: blue;">${resetLink}</a>
      `,
    };

    // send mail
    await transporter.sendMail(mailOptions);

    return res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// SEND 2FA
exports.send2FA = (req, res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.otp = otp;
  req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
  res.json({ message: "OTP generated", otp });
};

// VERIFY 2FA
exports.verify2FA = (req, res) => {
  const { otp } = req.body;
  if (req.session.otp === otp && Date.now() < req.session.otpExpiry) {
    res.json({ message: "2FA verification successful" });
  } else {
    res.status(400).json({ message: "Invalid or expired OTP" });
  }
};
