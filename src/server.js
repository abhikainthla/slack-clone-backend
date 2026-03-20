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
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }

      onlineUsers.get(userId).add(socket.id);

      io.emit("presence_update", {
        userId,
        status: "online",
      });
    });


  console.log("User connected:", socket.id);

  socket.on("get_online_users", () => {
  const users = [];

  for (let [userId] of onlineUsers) {
    users.push(userId);
  }

  socket.emit("online_users_list", users);
});


  /* JOIN CHANNEL */
  socket.on("join_channel", (channelId) => {
    socket.join(channelId);
  });

  /* SEND MESSAGE */
  socket.on("send_message", (data) => {
    const { channelId, message } = data;

    io.to(channelId).emit("receive_message", message);

    //  emit delivered back to sender
    socket.emit("message_delivered", {
      messageId: message._id,
    });
  });

  /* REACTION */
socket.on("reaction_update", (data) => {
  const { channelId } = data;
  io.to(channelId).emit("reaction_updated", data);
});


/* PIN */
socket.on("pin_update", (data) => {
  io.to(data.channelId).emit("pin_updated", data);
});

/* BOOKMARK */
socket.on("bookmark_update", (data) => {
  io.to(data.channelId).emit("bookmark_update", data);
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

  /* LEAVE CHANNEL */

socket.on("leave_channel", (channelId) => {
  socket.leave(channelId);
});

socket.on("message_read", ({ messageId, userId }) => {
  io.emit("message_read_update", {
    messageId,
    userId,
  });
});


  socket.on("disconnect", () => {
    for (let [userId, sockets] of onlineUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          io.emit("presence_update", {
            userId,
            status: "offline",
          });
        }
      }
    }
  });


  });


app.use(
  cors({
    origin: process.env.FRONTEND_URL, // your frontend URL
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
app.use((req, res, next) => {
  req.io = io;
  next();
});


connectDB();

app.get("/", (req, res) => {
  res.send("Slack Clone API Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
