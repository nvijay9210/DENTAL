const UAParser = require("ua-parser-js");

/**
 * Extract client info from a request
 * @param {Object} req - Express request object
 * @returns {Object} client info including IP, device, browser, OS, and loginTime
 */
function getClientInfo(req) {
  // Get IP address
  let ip =
    req.headers["x-forwarded-for"] || 
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0]; // Use first IP if multiple
  }

  // Get User-Agent info
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  // Build client info object
  return {
    ip,
    browser: uaResult.browser.name + " " + uaResult.browser.version,
    os: uaResult.os.name + " " + uaResult.os.version,
    device: uaResult.device.model || "Desktop",
    deviceType: uaResult.device.type || "Computer",
    cpu: uaResult.cpu.architecture,
    loginTime: new Date(),
  };
}

module.exports = {getClientInfo};
