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

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("user_online", (userId) => {

    onlineUsers.set(userId, socket.id);

    io.emit("presence_update", {
      userId,
      status: "online"
    });
      });

  console.log("User connected:", socket.id);


  /* JOIN CHANNEL */
  socket.on("join_channel", (channelId) => {
    socket.join(channelId);
  });

  /* SEND MESSAGE */
  socket.on("send_message", (data) => {

    const { channelId, message } = data;

    io.to(channelId).emit("receive_message", message);
  });

   /* USER TYPING */
  socket.on("typing", ({ channelId, user }) => {
    socket.to(channelId).emit("user_typing", user);
  });

  /* STOP TYPING */
  socket.on("stop_typing", ({ channelId, user }) => {
    socket.to(channelId).emit("user_stop_typing", user);
  });

  /* NOTIFICATION */
  socket.on("new_notification", (userId, notification) => {
  const socketId = onlineUsers.get(userId);

  if (socketId) {
    io.to(socketId).emit("receive_notification", notification);
  }
});


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
        for (let [userId, socketId] of onlineUsers) {

      if (socketId === socket.id) {

        onlineUsers.delete(userId);

        io.emit("presence_update", {
          userId,
          status: "offline"
        });

      }

    }

  });

});


app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api", apiLimiter);


connectDB();

app.get("/", (req, res) => {
  res.send("Slack Clone API Running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
