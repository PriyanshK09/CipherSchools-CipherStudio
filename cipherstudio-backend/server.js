import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import compression from "compression";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(","),
    credentials: true
  }
});

app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(","),
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CipherStudio API" });
});

// Health checks
const dbStateMap = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

const healthHandler = (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Number(process.uptime().toFixed(0)),
    timestamp: new Date().toISOString(),
    database: dbStateMap[mongoose.connection.readyState] || "unknown"
  });
};

app.get("/healthz", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;

// Collaboration sockets
io.on("connection", (socket) => {
  // Client should join a room per projectId or workspaceId
  socket.on("join", ({ room, user }) => {
    socket.join(room);
    socket.to(room).emit("presence:join", { user, socketId: socket.id });
  });

  socket.on("cursor", ({ room, userId, position }) => {
    socket.to(room).emit("cursor:update", { userId, position });
  });

  socket.on("content:change", ({ room, patch }) => {
    // Broadcast to others; clients will apply CRDT/OT patch
    socket.to(room).emit("content:apply", { patch });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("presence:leave", { socketId: socket.id });
      }
    }
  });
});

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
