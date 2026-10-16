const crypto = require('crypto');

/**
 * Middleware to authenticate backend-to-backend requests using a shared service key.
 * Uses timingSafeEqual to prevent timing attacks.
 */
const verifyServiceKey = (req, res, next) => {
  const incomingKey = req.headers['x-service-key'] || req.headers['X-Service-Key'];
  const configuredKey = process.env.BMC_SERVICE_KEY || 'bmc_shared_service_key_2026';

  if (!incomingKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing X-Service-Key header'
    });
  }

  const incomingBuffer = Buffer.from(String(incomingKey));
  const configuredBuffer = Buffer.from(String(configuredKey));

  if (
    incomingBuffer.length !== configuredBuffer.length ||
    !crypto.timingSafeEqual(incomingBuffer, configuredBuffer)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid service key'
    });
  }

  next();
};

module.exports = verifyServiceKey;
