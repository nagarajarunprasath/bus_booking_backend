const jwt = require("jsonwebtoken");
const { client } = require("../models/database");
exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }
  // verify if token is there
  if (!token) {
    return res.status(400).json({
      message: "not authorized to access this route",
    });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
      if (err) {
        err = {
          name: "JsonWebTokenError",
          message: "Token expired. Login again",
        };
        console.log(err.message);
        return res.status(403).json({
          message: err.message,
        });
      } else {
        client.query(
          `select clientid,firstname,lastname,gender,telephone from clients where clientid='${decoded.id}'`,
          (error, result) => {
            if (error) console.log(error);
            req.user = result.rows;
            next();
          }
        );
      }
    });
  } catch (error) {
    console.log(error);
  }
};
