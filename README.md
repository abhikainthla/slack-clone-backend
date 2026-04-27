# 🚀 Slack Clone Backend

A scalable backend for a Slack-like real-time chat application. Handles authentication, messaging, channels, notifications, and real-time communication using WebSockets.

---

## 🚀Live
[Hosted Link](https://syncube-backend.onrender.com)

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- Cloudinary (for file uploads)

---

## ✨ Features

- 🔐 User Authentication (JWT)
- 👤 User profiles & presence tracking
- 💬 Channel-based messaging
- 📩 Direct messaging (DMs)
- 🔔 Notification system
- 🟢 Real-time online/offline status
- 📁 File upload support
- ⚡ WebSocket-based communication

---

## 📂 Project Structure
```cs
src/
│── controllers/
│── models/
│── routes/
│── middleware/
│── sockets/
│── utils/
│── config/
│── server.js
```


---

## ⚙️ Environment Variables

Create a `.env` file:

```js
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```


---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/abhikainthla/slack-clone-backend.git
```


### 2. Install dependencies

```bash
npm install
```


### 3. Run server

```bash
npm run dev
```


---


---

## 🔌 Socket Events

| Event              | Description                  |
|------------------|-----------------------------|
| connect          | User connects               |
| disconnect       | User disconnects            |
| send_message     | Send message                |
| receive_message  | Receive message             |
| user_online      | User comes online           |
| user_offline     | User goes offline           |

---

## 🧪 Future Improvements

- Message encryption 🔒
- Rate limiting 🚦
- Microservices architecture 🧩
- Kubernetes deployment ☸️

---

## 📄 License

MIT License


