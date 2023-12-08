const jwt = require("jsonwebtoken");
const { Post } = require("../models/post");
const { User } = require("../models/user");
const axios = require("axios");

module.exports.requireSignin = async (req, res, next) => {
  const token = req.headers.authorization;

  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    req.user = await User.findOne({ email: data.email }).select("_id");

    next();
  } catch (err) {
    // console.log("catch err", err)
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        //   return res.json({ message: "Unauthorized" });
        return res.status(401).send("Token expired or does not exist");
      }

      req.user = decoded;

      next();
    });
  }
};

module.exports.canEditDeletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params._id);
    const userId = req.user._id.toString();

    if (userId != post.postedBy) {
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
