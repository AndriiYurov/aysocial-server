const jwt = require("jsonwebtoken");
const { Post } = require("../models/post");
const { User } = require("../models/user")

module.exports.requireSignin = async (req, res, next) => {
  const token = req.headers.authorization;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      //   return res.json({ message: "Unauthorized" });
      return res.status(401).send("Token expired or does not exist");
    }

    req.user = decoded;
    next();
  });
};

module.exports.canEditDeletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params._id);
    // console.log("POST in DELETE MIDDLEWRE =>", post);
    if (req.user._id != post.postedBy) {
      return res.status(401).send("Unauthorized");
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports.isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "Admin") {
      return res.status(400).send("Unauthorized");
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};
