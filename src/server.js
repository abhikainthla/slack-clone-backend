import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import onlineUsers from "./sockets/presence.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import notificationRoutes from "./routes/notification.routes.js";
import healthRoute from "./routes/health.route.js";
import User from "./models/User.js";
import Workspace from "./models/Workspace.js";
import path from "path";

dotenv.config({ path: path.resolve(".env") });
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("socketio", io);

io.on("connection", (socket) => {
  // Use a variable to track which user this socket belongs to
  let currentUserId = null;

socket.on("user_online", async (userId) => {
  if (!userId) return;

  currentUserId = userId;

  socket.join(userId);

  // join workspaces
  const workspaces = await Workspace.find({
    "members.user": userId,
  }).select("_id");

  workspaces.forEach((ws) => {
    socket.join(ws._id.toString());
  });

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());

    await User.findByIdAndUpdate(userId, {
      status: "online",
      lastSeen: null,
    });

    io.emit("presence_update", {
      userId,
      status: "online",
      lastSeen: null,
    });
  }

  onlineUsers.get(userId).add(socket.id);

  socket.emit("online_users_list", Array.from(onlineUsers.keys()));
});


socket.on("heartbeat", async (userId) => {
  if (!userId) return;

  await User.findByIdAndUpdate(userId, {
    lastSeen: new Date(),
  });
});



  socket.on("update_status", ({ userId, status }) => {
  io.emit("presence_update", { userId, status });
  console.log("ONLINE USERS:", users);
});
socket.on("get_online_users", () => {
  const ids = Array.from(onlineUsers.keys());
  socket.emit("online_users_list", ids);
});

  /* =================WORKSPACE ================= */
socket.on("join_workspace", (workspaceId) => {
  socket.join(workspaceId);
});

socket.on("leave_workspace", (workspaceId) => {
  socket.leave(workspaceId);
});


  /* ================= CHANNEL ================= */
  socket.on("join_channel", (channelId) => {
    socket.join(channelId);
  });

  socket.on("leave_channel", (channelId) => {
    socket.leave(channelId);
  });

    socket.on("join_user", (userId) => {
    socket.join(userId);
  });

  /* ================= MESSAGE ================= */
  socket.on("send_message", ({ channelId, message }) => {
    io.to(channelId).emit("receive_message", message);

    socket.emit("message_delivered", {
      messageId: message._id,
    });
  });

 socket.on("join_dm", (userId) => {
  socket.join(userId);
});






  /* ================= REACTIONS ================= */
  socket.on("reaction_update", (data) => {
    io.to(data.channelId).emit("reaction_update", data);
  });

  /* ================= PIN ================= */
  socket.on("pin_update", (data) => {
    io.to(data.channelId).emit("pin_update", data);
  });

  /* ================= BOOKMARK ================= */
  socket.on("bookmark_update", (data) => {
    io.to(data.channelId).emit("bookmark_update", data);
  });

  /* ================= TYPING ================= */
  socket.on("typing", ({ channelId, user }) => {
    socket.to(channelId).emit("user_typing", user);
  });

  socket.on("stop_typing", ({ channelId, user }) => {
    socket.to(channelId).emit("user_stop_typing", user);
  });

  /* ================= READ RECEIPTS ================= */
  socket.on("message_read", ({ messageId, userId }) => {
    io.emit("message_read_update", {
      messageId,
      userId,
    });
  });

  /* ================= DISCONNECT ================= */
socket.on("disconnect", async () => {
  if (!currentUserId) return;

  const sockets = onlineUsers.get(currentUserId);
  if (!sockets) return;

  sockets.delete(socket.id);

  if (sockets.size === 0) {
    onlineUsers.delete(currentUserId);

    const now = new Date();

    await User.findByIdAndUpdate(currentUserId, {
      status: "offline",
      lastSeen: now,
    });

    io.emit("presence_update", {
      userId: currentUserId,
      status: "offline",
      lastSeen: now,
    });
  }
});

});



app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", apiLimiter);
app.use("/api/health", healthRoute);



connectDB();

app.get("/", (req, res) => {
  res.send("Slack Clone API Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
