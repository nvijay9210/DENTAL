const {  writeLog } = require("../logs/logger");


module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (err.isOperational) {
    return res.status(statusCode).json({ status: "fail", message: err.message });
  }

  return res.status(500).json({ status: "error", message: "Something went wrong!" });
};


