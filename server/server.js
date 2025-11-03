const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./config/db.js");
const authRoutes = require("./routes/auth.routes.js");

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());  // note: call cookieParser as a function
app.use(
  cors({
    origin: "",
    credentials: true,
  })
);

// session set-up
app.use(
  session({
    secret: "sessionSecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 },
  })
);

// connect to mongodb
connectDB();

app.use("/api/auth", authRoutes);  // added a leading slash for route path

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
