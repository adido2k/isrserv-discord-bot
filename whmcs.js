// whmcs.js
const axios = require("axios");

// כתובות ופרטי API
const WHMCS_URL        = process.env.WHMCS_URL;        // למשל: https://billing.isrserv.co.il/includes/api.php
const WHMCS_IDENTIFIER = process.env.WHMCS_IDENTIFIER; // API Identifier
const WHMCS_SECRET     = process.env.WHMCS_SECRET;     // API Secret
const WHMCS_ACCESS_KEY = process.env.WHMCS_ACCESS_KEY; // אם מוגדר אצלך (לא חובה בכל התקנות)

// מחלקות תמיכה (ID לפי מה שהגדרת ב-Railway)
const SUPPORT_DEPARTMENT_ID          = process.env.SUPPORT_DEPARTMENT_ID;          // כללי
const SUPPORT_DEPARTMENT_GAMESERVERS = process.env.SUPPORT_DEPARTMENT_GAMESERVERS; // Gameservers
const SUPPORT_DEPARTMENT_BILLING     = process.env.SUPPORT_DEPARTMENT_BILLING;     // Billing
const SUPPORT_DEPARTMENT_ABUSE       = process.env.SUPPORT_DEPARTMENT_ABUSE;       // Abuse

// קריאה כללית ל-WHMCS
async function callWhmcs(action, params = {}) {
  const data = {
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    accesskey: WHMCS_ACCESS_KEY,
    action,
    responsetype: "json",
    ...params,
  };

  const res = await axios.post(
    WHMCS_URL,
    new URLSearchParams(data).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (res.data.result !== "success") {
    console.error("WHMCS error response:", res.data);
    throw new Error(`WHMCS error: ${res.data.message || res.data.result}`);
  }

  return res.data;
}

// ----------------- סטטוס שירות -----------------
async function getServiceStatus(serviceId) {
  const data = await callWhmcs("GetClientsProducts", {
    serviceid: serviceId,
  });

  const product = data.products.product?.[0];
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    status: product.status,
    nextDueDate: product.nextduedate,
  };
}

// ----------------- לינק לחידוש -----------------
async function getRenewLinkByService(serviceId) {
  // כאן זה לינק כללי לאיזור לקוח עם המוצר
  return `${process.env.CLIENT_AREA_URL}/clientarea.php?action=productdetails&id=${serviceId}`;
}

// ----------------- אימות לקוח לפי מייל -----------------
async function verifyClientByEmail(email) {
  const clientData = await callWhmcs("GetClientsDetails", {
    email,
    stats: true,
  });

  const clientId = clientData.clientid;

  const productsData = await callWhmcs("GetClientsProducts", {
    clientid: clientId,
    status: "Active",
  });

  return {
    clientId,
    activeServices: productsData.products.product || [],
  };
}

// ----------------- פתיחת טיקט תמיכה -----------------
function getDeptIdByKey(key) {
  switch (key) {
    case "gameservers":
      return SUPPORT_DEPARTMENT_GAMESERVERS || SUPPORT_DEPARTMENT_ID;
    case "billing":
      return SUPPORT_DEPARTMENT_BILLING || SUPPORT_DEPARTMENT_ID;
    case "abuse":
      return SUPPORT_DEPARTMENT_ABUSE || SUPPORT_DEPARTMENT_ID;
    case "general":
    default:
      return SUPPORT_DEPARTMENT_ID;
  }
}

async function openSupportTicket({
  departmentKey = "general",
  subject,
  message,
  email,
  priority = "Medium",
  discordUser,
}) {
  const deptid = getDeptIdByKey(departmentKey);

  const safeSubject =
    subject || `פניה מ-Discord (${departmentKey || "general"})`;

  const safeMessage =
    message ||
    "פניה נפתחה דרך הבוט בדיסקורד (לא סופק טקסט הודעה מפורט).";

  const name = discordUser
    ? `${discordUser.username}#${discordUser.discriminator}`
    : "Discord User";

  const data = await callWhmcs("OpenTicket", {
    deptid,
    subject: safeSubject,
    message: safeMessage,
    priority,
    clientemail: email,
    name,
  });

  // WHMCS מחזיר בד"כ: tid (מספר ציבורי), id (ID פנימי), ו-c (קוד גישה בלינק)
  return {
    tid: data.tid,
    ticketId: data.id,
    c: data.c,
  };
}

module.exports = {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
  openSupportTicket,
};
