const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      
      min: 6,
      max: 64,
    },
    secret: {
      type: String,
      
    },
    username: {
      type: String,
      unique: true,
      
    },
    about: {},
    image: {
      url: String,
      public_id: String,
    },
    role: {
      type: String,
      default: "Subscriber",
    },
    following: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = { User };
