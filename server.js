// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const morgan = require("morgan");
require("dotenv").config();

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

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB connection error =>", err));

//middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
  socket.on("new-post", (newPost) => {
    // console.log("new post =>", newPost);
    // socket.emit("receive-message", message)
     socket.broadcast.emit("new-post", newPost);
  });
});

const port = process.env.PORT || 8000;
http.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});