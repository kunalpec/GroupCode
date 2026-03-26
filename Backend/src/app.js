import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";

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

// Passport
app.use(passport.initialize());

// Routes
import oAuthRouter from "./route/oauth.route.js";
import userRouter from "./route/user.route.js";
import containerRouter from "./route/container.route.js";
import roomRouter from "./route/room.route.js";
app.use("/auth", oAuthRouter);
app.use("/api/users", userRouter);
app.use("/api/container", containerRouter);
app.use("/api/room", roomRouter);


// Error handler (optional but recommended)
import {errorHandler} from "./middleware/error.middleware.js";
app.use(errorHandler);

export { app };