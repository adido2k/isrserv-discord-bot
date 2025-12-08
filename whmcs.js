// whmcs.js
require("dotenv").config();
const axios = require("axios");

const {
  WHMCS_URL,
  WHMCS_IDENTIFIER,
  WHMCS_SECRET,
  WHMCS_ACCESS_KEY,
  CLIENT_AREA_URL,
} = process.env;

if (!WHMCS_URL || !WHMCS_IDENTIFIER || !WHMCS_SECRET) {
  console.warn(
    "⚠ WHMCS env vars are missing (WHMCS_URL / WHMCS_IDENTIFIER / WHMCS_SECRET). WHMCS-related commands may fail."
  );
}

// פונקציה בסיסית לקריאת WHMCS API
async function callWhmcsApi(params) {
  if (!WHMCS_URL) {
    throw new Error("WHMCS_URL is not defined");
  }

  const payload = new URLSearchParams({
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    accesskey: WHMCS_ACCESS_KEY || "",
    responsetype: "json",
    ...params,
  });

  const response = await axios.post(WHMCS_URL, payload);
  const data = response.data;

  if (!data) throw new Error("Empty response from WHMCS");

  if (data.result && data.result !== "success") {
    throw new Error(`WHMCS error: ${data.message || data.result}`);
  }

  return data;
}

/**
 * getServiceStatus(serviceId)
 * מחזיר מידע על שירות יחיד לפי service_id
 */
async function getServiceStatus(serviceId) {
  try {
    const data = await callWhmcsApi({
      action: "GetClientsProducts",
      serviceid: serviceId,
      limitnum: 1,
    });

    const product =
      data.products && data.products.product && data.products.product[0];

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      status: product.status,
      nextDueDate: product.nextduedate,
    };
  } catch (err) {
    console.error("getServiceStatus error:", err.message);
    return null;
  }
}

/**
 * getRenewLinkByService(serviceId)
 * מייצר לינק חידוש סטנדרטי של WHMCS (cart renewals)
 */
function getRenewLinkByService(serviceId) {
  if (!CLIENT_AREA_URL) {
    console.warn("CLIENT_AREA_URL is not defined.");
    return null;
  }

  // פורמט חידוש קלאסי של WHMCS:
  // cart.php?a=add&renewals=SERVICEID
  return `${CLIENT_AREA_URL}/cart.php?a=add&renewals=${encodeURIComponent(
    serviceId
  )}`;
}

/**
 * verifyClientByEmail(email)
 * מאתר לקוח לפי אימייל + מביא את השירותים הפעילים שלו
 */
async function verifyClientByEmail(email) {
  try {
    // קודם מביאים את פרטי הלקוח
    const details = await callWhmcsApi({
      action: "GetClientsDetails",
      email,
      stats: true,
    });

    if (!details || !details.clientid) {
      return { clientId: null, activeServices: [] };
    }

    const clientId = details.clientid;

    // מביאים מוצרים של הלקוח
    const productsData = await callWhmcsApi({
      action: "GetClientsProducts",
      clientid: clientId,
      status: "Active",
    });

    const active =
      productsData.products && productsData.products.product
        ? productsData.products.product
        : [];

    return {
      clientId,
      activeServices: active,
    };
  } catch (err) {
    console.error("verifyClientByEmail error:", err.message);
    return { clientId: null, activeServices: [] };
  }
}

module.exports = {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
};
