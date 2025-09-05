const UAParser = require("ua-parser-js");

/**
 * Extract client info from a request
 * @param {Object} req - Express request object
 * @returns {Object} client info including IP, device, browser, OS, and loginTime
 */
function getClientInfo(req) {
  // Get IP address
  let ip = req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] || // Common in Nginx
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);

  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim(); // Use first IP (proxy chains)
  }

  // Normalize IPv6 to IPv4 if possible (e.g., ::ffff:127.0.0.1 → 127.0.0.1)
  if (ip && ip.includes('::ffff:')) {
    ip = ip.substring(ip.lastIndexOf(':') + 1); // Extract IPv4 part
  }

  // Handle localhost cases (optional: for logging)
  if (ip === '::1') ip = '127.0.0.1'; // Convert IPv6 loopback to IPv4
  if (ip === '127.0.0.1' && process.env.NODE_ENV === 'production') {
    // This may still be local — could warn or skip in logs
  }

  // Get User-Agent
  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  // Build client info
  return {
    ip,
    browser: `${uaResult.browser.name} ${uaResult.browser.version}`.trim(),
    os: `${uaResult.os.name} ${uaResult.os.version}`.trim(),
    device: uaResult.device.model || 'Unknown',
    deviceType: uaResult.device.type || 'Computer',
    cpu: uaResult.cpu.architecture || 'Unknown',
    loginTime: new Date().toISOString(), // Use ISO for consistency
  };
}

module.exports = {getClientInfo};
