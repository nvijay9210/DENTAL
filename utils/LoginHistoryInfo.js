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
    req.headers["x-real-ip"] || // Nginx
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket
      ? req.connection.socket.remoteAddress
      : null);

  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0].trim(); // first IP (proxy chains)
  }

  // Normalize IPv6 to IPv4 (::ffff:127.0.0.1 → 127.0.0.1)
  if (ip && ip.includes("::ffff:")) {
    ip = ip.substring(ip.lastIndexOf(":") + 1);
  }

  // Handle localhost
  if (ip === "::1") ip = "127.0.0.1";

  // Get User-Agent
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  return {
    ip,
    browser: `${uaResult.browser.name || "Unknown"} ${
      uaResult.browser.version || ""
    }`.trim(),
    os: `${uaResult.os.name || "Unknown"} ${uaResult.os.version || ""}`.trim(),
    device: uaResult.device.model || "Unknown",
    deviceType: uaResult.device.type || "Computer",
    cpu: uaResult.cpu.architecture || "Unknown",
    userAgent,
  };
}

module.exports = { getClientInfo };


module.exports = {getClientInfo};
