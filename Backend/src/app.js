import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { rateLimit } from 'express-rate-limit';
import morgan from "morgan";


// 🔥 Load strategies
import "./oauth/google.oauth.js";
import "./oauth/git.oauth.js";

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// 🛡️ Define the rules
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(globalLimiter);

// Apply to all requests
// app.use(globalLimiter);

// Passport
app.use(passport.initialize());


// Routes
app.get("/", (req, res) => {
  res.json({
    status:200,
    message:"server is running",
    data:null
  });
});

import oAuthRouter from "./route/oauth.route.js";
import userRouter from "./route/user.route.js";
import containerRouter from "./route/container.route.js";
import roomRouter from "./route/room.route.js";
import inviteRouter from "./route/invite.route.js";

app.use("/auth", oAuthRouter);
app.use("/api/users", userRouter);
app.use("/api/container", containerRouter);
app.use("/api/room", roomRouter);
app.use("/api/invite", inviteRouter);


// Error handler (optional but recommended)
import {errorHandler} from "./middleware/error.middleware.js";
app.use(errorHandler);

export { app };