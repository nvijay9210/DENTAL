const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const tenantsConfig = {
  tenant1: {
    jwksUri: 'https://keycloak.example.com/auth/realms/smilecare/protocol/openid-connect/certs',
    audience: 'tenant1-client',
    issuer: 'https://keycloak.example.com/auth/realms/tenant1'
  }
};

function getKeyClient(tenantId) {
  const tenant = tenantsConfig[tenantId];
  if (!tenant) throw new Error('Unknown tenant');

  return jwksClient({
    jwksUri: tenant.jwksUri,
  });
}

async function verifyTokenForTenant(token, tenantId) {
  const tenant = tenantsConfig[tenantId];
  if (!tenant) throw new Error('Unknown tenant');

  const client = getKeyClient(tenantId);

  function getKey(header, callback) {
    client.getSigningKey(header.kid, function(err, key) {
      if (err) return callback(err);
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      audience: tenant.audience,
      issuer: tenant.issuer
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}


async function multiTenantAuthMiddleware(req, res, next) {
  try {
    const token = req.cookies['access_token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID header required' });

    const user = await verifyTokenForTenant(token, tenantId);

    req.user = user;
    req.tenantId = tenantId;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token or tenant' });
  }
}

module.exports={multiTenantAuthMiddleware}