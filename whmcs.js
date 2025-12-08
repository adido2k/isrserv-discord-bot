// whmcs.js
const axios = require('axios');

const WHMCS_URL        = process.env.WHMCS_URL;        // למשל: https://billing.isrserv.co.il/includes/api.php
const WHMCS_IDENTIFIER = process.env.WHMCS_IDENTIFIER; // API Identifier
const WHMCS_SECRET     = process.env.WHMCS_SECRET;     // API Secret
const WHMCS_ACCESS_KEY = process.env.WHMCS_ACCESS_KEY; // אם מוגדר אצלך (לא חובה)

async function callWhmcs(action, params = {}) {
  const data = {
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    accesskey: WHMCS_ACCESS_KEY,
    action,
    responsetype: 'json',
    ...params,
  };

  const res = await axios.post(
    WHMCS_URL,
    new URLSearchParams(data).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  if (res.data.result !== 'success') {
    throw new Error(`WHMCS error: ${res.data.message || res.data.result}`);
  }

  return res.data;
}

// ---------- שירותים / מנויים ----------

// סטטוס שירות לפי service_id
async function getServiceStatus(serviceId) {
  const data = await callWhmcs('GetClientsProducts', {
    serviceid: serviceId,
  });

  const product = data.products.product?.[0];
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    status: product.status, // Active / Suspended / וכו'
    nextDueDate: product.nextduedate,
  };
}

// לינק לחידוש מנוי (פשוט – מפנה לדף השירות באיזור הלקוח)
async function getRenewLinkByService(serviceId) {
  return `${process.env.CLIENT_AREA_URL}/clientarea.php?action=productdetails&id=${serviceId}`;
}

// אימות לפי מייל: מחזיר clientId + רשימת שירותים פעילים
async function verifyClientByEmail(email) {
  const clientData = await callWhmcs('GetClientsDetails', {
    email,
    stats: true,
  });

  const clientId = clientData.clientid;

  const productsData = await callWhmcs('GetClientsProducts', {
    clientid: clientId,
    status: 'Active',
  });

  return {
    clientId,
    activeServices: productsData.products.product || [],
  };
}

// ---------- טיקטים / תמיכה ----------

/**
 * departmentKey:
 *  - "general"
 *  - "gameservers"
 *  - "billing"
 *  - "abuse"
 */
function resolveDepartmentId(departmentKey) {
  const map = {
    general: process.env.SUPPORT_DEPARTMENT_ID,
    gameservers: process.env.SUPPORT_DEPARTMENT_GAMESERVERS,
    billing: process.env.SUPPORT_DEPARTMENT_BILLING,
    abuse: process.env.SUPPORT_DEPARTMENT_ABUSE,
  };

  return map[departmentKey] || map.general;
}

/**
 * פתיחת טיקט תמיכה ב-WHMCS
 */
async function openSupportTicket({
  departmentKey,
  subject,
  message,
  email,
  priority = 'Medium',
  discordUser,
}) {
  const deptid = resolveDepartmentId(departmentKey);

  const body =
    `${message}\n\n` +
    `------------------------------\n` +
    `נפתח דרך דיסקורד על ידי: ${discordUser.tag} (ID: ${discordUser.id})`;

  const data = await callWhmcs('OpenTicket', {
    deptid,
    subject,
    message: body,
    name: discordUser.username,
    email,
    priority, // Low / Medium / High
  });

  // WHMCS מחזיר בדרך כלל ticketid, tid, c
  return {
    ticketId: data.ticketid,
    tid: data.tid,
    c: data.c,
  };
}

module.exports = {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
  openSupportTicket,
};
