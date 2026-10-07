// =====================================
// TENANT CONFIG MAP
// =====================================

const HOST_REALM_CLIENT = {

  "localhost": {
    realm: "dentalhub",
    clientId: "mydentist.in",
  },

  "dental.brightoncloudtech.com": {
    realm: "dental",
    clientId: "mydentist.in",
  },

  "tenant2.dental.com": {
    realm: "tenant2",
    clientId: "tenant2-client",
  },
};

// =====================================
// GET CONFIG BY HOST
// =====================================

const getTenantConfigByHost = (
  host
) => {

  if (!host) {

    throw new Error(
      "Host is required"
    );
  }

  const config =
    HOST_REALM_CLIENT[host];

  if (!config) {

    throw new Error(
      `No config found for host: ${host}`
    );
  }

  return config;
};

module.exports = {
  HOST_REALM_CLIENT,
  getTenantConfigByHost,
};