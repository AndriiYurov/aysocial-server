const { User } = require("../models/user");
const { hashPassword, comparePassword } = require("../helpers/auth");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const axios = require("axios");

module.exports.loginGoogle = async (req, res) => {
  const { google_token } = req.body;

  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${google_token}`,
      {
        headers: {
          Authorization: `Bearer ${google_token}`,
          Accept: "application/json",
        },
      }
    );
    res.json({ google_token, user: data });
    console.log(data);
  } catch (err) {
    console.log(err);
    return res.status(401).send("Unauthorized");
  }
};

module.exports.register = async (req, res) => {
  const { name, email, password, secret } = req.body;
  if (!name) return res.status(400).send("Name is required");
  if (!password || password.length < 6)
    return res
      .status(400)
      .send("Password is required and should be 6 characters long");
  if (!secret) return res.status(400).send("Answer is required");
  const exist = await User.findOne({ email });
  if (exist) return res.status(400).send("email is taken");

  const hashedPassword = await hashPassword(password);
  const uniqueUserName = nanoid(6);
  const user = new User({
    name,
    email,
    password: hashedPassword,
    secret,
    username: `User${uniqueUserName}`,
  });
  try {
    await user.save();
    console.log(user);
    return res.json({ ok: true });
  } catch (err) {
    console.log("register failded =>", err);
    return res.status(400).send("Error. Try again");
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password, google_token } = req.body;

    if (google_token) {
      const { data } = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${google_token}`,
        {
          headers: {
            Authorization: `Bearer ${google_token}`,
            Accept: "application/json",
          },
        }
      );

      if (data.error) {
        return res.status(401).send("Unauthorized");
      } else {
        const user = await User.findOne({ email: data.email });
        const uniqueUserName = nanoid(6);
        if (!user) {
          const user = new User({
            name: data.name,
            email: data.email,
            username: `User${uniqueUserName}`,
          });
          console.log(user);
          await user.save();
          return res.json({ google_token, user });
        }

        return res.json({ google_token, user });
      }
    }
    // check if db has user
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "No user found" });
    //check login method
    if (!user.password) {
      return res
        .status(401)
        .send("Please login via the method you used to signup");
    }
    // check password
    const match = await comparePassword(password, user.password);
    if (!match) return res.status(400).send("Wrong password");

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.password = undefined;
    user.secret = undefined;
    res.json({ token, user });
  } catch (err) {
    console.log(err);
    return res.status(401).send("Unauthorized");
  }
};

module.exports.currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    // res.json(user)
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
};

module.exports.forgotPassword = async (req, res) => {
  const { email, newPassword, secret } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.json({
      error: "New password is required and should be min 6 characters long",
    });
  }
  if (!secret) {
    return res.json({ error: "Secret is required" });
  }

  const user = await User.findOne({ email, secret });
  if (!user) {
    return res.json({ error: "We cant verify you with those details" });
  }
  try {
    const hashed = await hashPassword(newPassword);
    await User.findByIdAndUpdate(user._id, { password: hashed });
    return res.json({
      success: "Congrats! You can now login with your new password",
      ok: true,
    });
  } catch (err) {
    console.log(err);
    return res.json({ error: "Something wrong. Try again" });
  }
};

module.exports.profileUpdate = async (req, res) => {
  try {
    const data = {};
    if (req.body.username) {
      const username = req.body.username
      const user = await User.findOne({ username });
      if (user && user._id != req.user._id) {
        return res.json({ error: "User name already taken" });
      } else {
        data.username = req.body.username;
      }
      
    }
    if (req.body.about) {
      data.about = req.body.about;
    }
    if (req.body.name) {
      data.name = req.body.name;
    }
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.json({
          error: "Password is required and should be minimum 6 characters long",
        });
        // return res.status(400).send("Password is required and should be minimum 6 characters long");
      } else {
        data.password = await hashPassword(req.body.password);
      }
    }
    if (req.body.secret) {
      data.secret = req.body.secret;
    }
    if (req.body.image) {
      data.image = req.body.image;
    }

    let user = await User.findByIdAndUpdate(req.user._id, data, { new: true });
    user.password = undefined;
    user.secret = undefined;
    res.json(user);
  } catch (err) {
    // if (err.code == 11000) {
    //   return res.json({ error: "Duplicate username" });
    // }
    console.log(err);
  }
};

module.exports.findPeople = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    //user.following
    let following = user.following;
    following.push(user._id);
    const people = await User.find({ _id: { $nin: following } })
      .select("-password -secret")
      .limit(10);
    res.json(people);
  } catch (err) {
    console.log(err);
  }
};

//middleware
module.exports.addFollower = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.body._id, {
      $addToSet: { followers: req.user._id },
    });
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports.userFollow = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { following: req.body._id },
      },
      { new: true }
    ).select("-password -secret");
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

module.exports.userFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const following = await User.find({ _id: user.following })
      .select("-password -secret")
      .limit(100);
    res.json(following);
  } catch (err) {
    console.log(err);
  }
};

module.exports.removeFollower = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.body._id, {
      $pull: { followers: req.user._id },
    });
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports.userUnfollow = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { following: req.body._id },
      },
      { new: true }
    ).select("-password -secret");
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

module.exports.searchUser = async (req, res) => {
  const { query } = req.params;
  if (!query) return;
  try {
    // $regexis is special method from mongodb
    // The i modifier is used to perform case-insensitive matching
    const user = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
      ],
    }).select("-password -secret");
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

module.exports.getUser = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "-password -secret"
    );
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};
