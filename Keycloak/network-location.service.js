const axios = require("axios");

// =====================================================
// CHECK PRIVATE / LOCAL IP
// =====================================================

const isPrivateIp = (ip) => {
  if (!ip) return true;

  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
};

// =====================================================
// GET PUBLIC IP
// =====================================================

const getPublicIp = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json", {
      timeout: 5000,
    });

    const publicIp = response.data?.ip || null;

    console.log("🌍 Public IP:", publicIp);

    return publicIp;
  } catch (error) {
    console.error("❌ PUBLIC IP ERROR:", error.message);

    return null;
  }
};

// =====================================================
// GPS REVERSE GEOCODING
//
// GPS latitude/longitude
//        ↓
// Nominatim
//        ↓
// City / State / Country
// =====================================================

const getGpsLocation = async (latitude, longitude) => {
  try {
    const lat = Number(latitude);
    const lon = Number(longitude);

    // -------------------------------------------------
    // Validate GPS
    // -------------------------------------------------

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.log("⚠️ Invalid GPS coordinates:", {
        latitude,
        longitude,
      });

      return {
        location: null,
        city: null,
        state: null,
        country: null,
        latitude: null,
        longitude: null,
        timezone: null,
      };
    }

    console.log("📍 GPS REVERSE LOOKUP:", {
      latitude: lat,
      longitude: lon,
    });

    // -------------------------------------------------
    // Nominatim Reverse Geocoding
    // -------------------------------------------------

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat,
          lon,
          format: "jsonv2",
          addressdetails: 1,
          zoom: 18,
          "accept-language": "en",
        },

        headers: {
          "User-Agent": "DentalApp/1.0 (dental.brightoncloudtech.com)",

          Accept: "application/json",
        },

        timeout: 10000,
      },
    );

    const data = response.data;

    // -------------------------------------------------
    // IMPORTANT:
    // This is the ACTUAL GPS reverse geocoding response.
    //
    // It should contain:
    // display_name
    // address
    //
    // It should NOT contain:
    // ip
    // connection
    // isp
    // success
    // -------------------------------------------------

    console.log("📍 NOMINATIM GPS RESPONSE:", JSON.stringify(data, null, 2));

    const address = data?.address || {};

    // -------------------------------------------------
    // CITY
    // -------------------------------------------------

    const city =
      address.city ||
      address.state_district ||
      address.town ||
      address.municipality ||
      address.village ||
      address.suburb ||
      address.city_district ||
      null;

    // -------------------------------------------------
    // STATE
    // -------------------------------------------------

    const state = address.state || address.region || null;

    // -------------------------------------------------
    // COUNTRY
    // -------------------------------------------------

    const country = address.country || null;

    // -------------------------------------------------
    // LOCATION
    // -------------------------------------------------

    const location = address.village || null;

    const result = {
      location,

      city,

      state,

      country,

      latitude: lat,

      longitude: lon,

      timezone: null,
    };

    console.log("📍 GPS LOCATION RESULT:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("❌ GPS REVERSE GEOCODING ERROR:", error.message);

    return {
      location: null,
      city: null,
      state: null,
      country: null,
      latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      timezone: null,
    };
  }
};

// =====================================================
// IP / NETWORK LOCATION
//
// IP
//  ↓
// ipwho.is
//  ↓
// Public IP / City / State / Country / ISP / Timezone
// =====================================================

const getNetworkLocation = async (requestIp) => {
  try {
    let lookupIp = requestIp || null;

    console.log("🌐 Initial Request IP:", lookupIp);

    // -------------------------------------------------
    // Local/private IP
    // -> Get public IP
    // -------------------------------------------------

    if (isPrivateIp(lookupIp)) {
      console.log("⚠️ Private/local IP detected:", lookupIp);

      lookupIp = await getPublicIp();
    }

    // -------------------------------------------------
    // No IP available
    // -------------------------------------------------

    if (!lookupIp) {
      return {
        publicIp: null,
        country: null,
        state: null,
        city: null,
        isp: null,
        latitude: null,
        longitude: null,
        timezone: null,
      };
    }

    console.log("🌐 IP LOCATION LOOKUP:", lookupIp);

    // -------------------------------------------------
    // IP Geolocation
    // -------------------------------------------------

    const response = await axios.get(
      `https://ipwho.is/${encodeURIComponent(lookupIp)}`,
      {
        timeout: 5000,
      },
    );

    const data = response.data;

    // -------------------------------------------------
    // IMPORTANT:
    // This is IPWHO.IS response.
    //
    // Do NOT call this Nominatim.
    // -------------------------------------------------

    console.log("🌐 IPWHOIS RESPONSE:", JSON.stringify(data, null, 2));

    // -------------------------------------------------
    // API failure
    // -------------------------------------------------

    if (!data || data.success === false) {
      return {
        publicIp: lookupIp,
        country: null,
        state: null,
        city: null,
        isp: null,
        latitude: null,
        longitude: null,
        timezone: null,
      };
    }

    // -------------------------------------------------
    // Final IP location
    // -------------------------------------------------

    const result = {
      publicIp: lookupIp,

      country: data.country || null,

      state: data.region || null,

      city: data.city || null,

      isp: data.connection?.isp || null,

      latitude: data.latitude != null ? Number(data.latitude) : null,

      longitude: data.longitude != null ? Number(data.longitude) : null,

      timezone: data.timezone?.id || null,
    };

    console.log("🌐 NETWORK LOCATION RESULT:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("❌ GEO LOCATION ERROR:", error.message);

    return {
      publicIp: requestIp || null,
      country: null,
      state: null,
      city: null,
      isp: null,
      latitude: null,
      longitude: null,
      timezone: null,
    };
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getNetworkLocation,
  getGpsLocation,
};
