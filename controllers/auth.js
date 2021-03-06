const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { createJWT } = require("../utils/auth");

const emailRegexp =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

exports.signUp = async (req, res) => {
  let { name, email, password, password_confirmation } = req.body;
  let errors = [];

  if (!name) {
    errors.push({ name: "required" });
  }
  if (!email) {
    errors.push({ email: "required" });
  }
  if (!emailRegexp.test(email)) {
    errors.push({ email: "invalid" });
  }
  if (!password) {
    errors.push({ password: "required" });
  }
  if (!password_confirmation) {
    errors.push({
      password_confirmation: "required",
    });
  }
  if (password != password_confirmation) {
    errors.push({ password: "mismatch" });
  }
  if (errors.length > 0) {
    return res.status(422).json({ errors: errors });
  }

  try {
    const user = await User.findOne({ email: email });

    if (user) {
      return res
        .status(422)
        .json({ errors: [{ user: "email already exists" }] });
    } else {
      const user = new User(req.body);

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
          if (err) throw err;

          user.password = hash;

          try {
            let result = await user.save();

            res.status(200).json({
              success: true,
              result: result,
            });
          } catch (error) {
            res.status(500).json({ errors: error });
          }
        });
      });
    }
  } catch (error) {
    res.status(500).json({ errors: error });
  }
};

exports.signIn = async (req, res) => {
  let { email, password } = req.body;
  let errors = [];

  if (!email) {
    errors.push({ email: "required" });
  }
  if (!emailRegexp.test(email)) {
    errors.push({ email: "invalid email" });
  }
  if (!password) {
    errors.push({ passowrd: "required" });
  }
  if (errors.length > 0) {
    return res.status(422).json({ errors: errors });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({
        errors: [{ user: "not found" }],
      });
    } else {
      try {
        let isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(400).json({ errors: [{ password: "incorrect" }] });
        } else {
          let access_token = createJWT(user.email, user._id, 3600);
          jwt.verify(access_token, process.env.TOKEN_SECRET, (err, decoded) => {
            if (err) {
              res.status(500).json({ erros: err });
            }
            if (decoded) {
              return res.status(200).json({
                success: true,
                token: access_token,
                message: user,
              });
            }
          });
        }
      } catch (error) {
        res.status(500).json({ errors: error });
      }
    }
  } catch (error) {
    res.status(500).json({ errors: error });
  }
};
