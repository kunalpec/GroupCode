import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { startIoServer } from "./socket/index.js";

dotenv.config();

connectDB()
  .then(() => {
    // Start server only after DB connection is successful
    const server = app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port: ${process.env.PORT || 8000}`);
    });

    // Handle server-level errors (like port already in use)
    server.on("error", (err) => {
      console.error("Server Error:", err);
    });

    // start the io server ok 
    startIoServer(server);
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1); // Optional: stop the process if DB fails
  });
