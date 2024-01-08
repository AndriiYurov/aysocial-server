// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const morgan = require("morgan");
require("dotenv").config();

const passport = require("passport");
const cookieSession = require("cookie-session");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  path: "/socket.io",
  cors: {
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-type"],
  },
});

const { Post } = require("./models/post");
const { posts } = require("./controllers/post");

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB connection error =>", err));

//middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(
  cookieSession({
    name: "session",
    keys: ["aysocial"],
    maxAge: 24 * 60 * 60 * 100,
  })
);

//autoload routes
fs.readdirSync("./routes").map((r) =>
  app.use("/api", require(`./routes/${r}`))
);

// socket.io
// io.on("connect", (socket) => {
//   // console.log("SOCKET.IO", socket.id);
//   socket.on("send-message", (message) => {
//     // socket.emit("receive-message", message)
//     socket.broadcast.emit("receive-message", message);
//   });
// });

io.on("connect", (socket) => {
  // console.log("SOCKET.IO", socket.id);
  socket.on("new-post", async (newPost) => {
    // console.log("new post =>", newPost);
    // socket.emit("receive-message", message)
    let result;
    try {
      const posts = await Post.find()
        .populate("postedBy", "_id name image")
        .populate("comments.postedBy", "_id name image")
        .sort({ createdAt: -1 })
        .limit(10);
      result = posts;
    } catch (err) {
      console.log(err);
    }

    socket.broadcast.emit("updated-post", result);
  });
});

const port = process.env.PORT || 8000;
http.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
