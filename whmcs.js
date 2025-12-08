// whmcs.js
// ------------------------------------------------------
// אינטגרציה בין הבוט ל-WHMCS דרך discord_api.php (localAPI)
// אין צורך ב-Identifier / Secret בצד של הבוט – הכול נעשה ב-PHP
// ------------------------------------------------------

const axios = require("axios");

// כתובת הפרוקסי ב-WHMCS
// אם תרצה בעתיד, אפשר להגדיר ENV בשם WHMCS_URL,
// ואם לא – הוא ישתמש בכתובת הקבועה.
const WHMCS_URL =
  process.env.WHMCS_URL ||
  "https://panel.isrserv.com/whmcs/discord_api.php";

// מחלקות תמיכה (IDs מה־Environment של Fly / Railway)
const SUPPORT_DEPARTMENT_ID = process.env.SUPPORT_DEPARTMENT_ID; // כללי
const SUPPORT_DEPARTMENT_GAMESERVERS =
  process.env.SUPPORT_DEPARTMENT_GAMESERVERS; // Gameservers
const SUPPORT_DEPARTMENT_BILLING =
  process.env.SUPPORT_DEPARTMENT_BILLING; // Billing
const SUPPORT_DEPARTMENT_ABUSE = process.env.SUPPORT_DEPARTMENT_ABUSE; // Abuse

// ------------------------------------------------------
// פונקציה כללית לקריאה ל-WHMCS דרך discord_api.php
// ------------------------------------------------------
async function callWhmcs(action, params = {}) {
  const data = {
    action,
    ...params,
  };

  const body = new URLSearchParams(data).toString();

  const res = await axios.post(WHMCS_URL, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  if (!res.data || res.data.result !== "success") {
    console.error("WHMCS error response:", res.data);
    throw new Error(
      (res.data && (res.data.message || res.data.result)) ||
        "Unknown WHMCS error"
    );
  }

  return res.data;
}

// ------------------------------------------------------
// סטטוס שירות לפי serviceid
// ------------------------------------------------------
async function getServiceStatus(serviceId) {
  const data = await callWhmcs("GetClientsProducts", {
    serviceid: serviceId,
  });

  const product =
    data.products && data.products.product
      ? data.products.product[0]
      : null;

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    status: product.status,
    nextDueDate: product.nextduedate,
  };
}

// ------------------------------------------------------
// לינק לחידוש שירות (clientarea)
// ------------------------------------------------------
async function getRenewLinkByService(serviceId) {
  // משתמש ב-CLIENT_AREA_URL שמוגדר ב-ENV
  return `${process.env.CLIENT_AREA_URL}/clientarea.php?action=productdetails&id=${serviceId}`;
}

// ------------------------------------------------------
// אימות לקוח לפי מייל – מחזיר clientId + שירותים פעילים
// ------------------------------------------------------
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
    activeServices:
      (productsData.products && productsData.products.product) || [],
  };
}

// ------------------------------------------------------
// בחירת מחלקת תמיכה לפי המפתח מהפקודה (/ticket department)
// ------------------------------------------------------
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

// ------------------------------------------------------
// פתיחת טיקט תמיכה
// 1. מנסה למצוא clientid לפי האימייל
// 2. אם נמצא – פותח טיקט על לקוח קיים (clientid בלבד)
// 3. אם לא – פותח טיקט כאורח עם name + clientemail
// ------------------------------------------------------
async function openSupportTicket({
  departmentKey = "general",
  subject,
  message,
  email,
  priority = "Medium",
  discordUser,
}) {
  const deptid = getDeptIdByKey(departmentKey);

  console.log("[WHMCS] openSupportTicket →", {
    departmentKey,
    deptid,
    email,
    priority,
  });

  const safeSubject =
    subject || `פניה מ־Discord (${departmentKey || "general"})`;
  const safeMessage =
    message ||
    "פניה נפתחה דרך הבוט בדיסקורד (לא סופק טקסט הודעה מפורט).";

  // ---- שלב 1: לבדוק אם המייל שייך ללקוח קיים ----
  let clientId = null;
  try {
    const c = await callWhmcs("GetClientsDetails", {
      email,
      stats: false,
    });
    if (c && c.clientid) {
      clientId = c.clientid;
      console.log("[WHMCS] found existing clientId:", clientId);
    }
  } catch (e) {
    console.log(
      "[WHMCS] email not found as existing client, opening ticket as guest"
    );
  }

  // ---- אם הלקוח קיים → פותחים טיקט עם clientid בלבד ----
  if (clientId) {
    const data = await callWhmcs("OpenTicket", {
      deptid,
      subject: safeSubject,
      message: safeMessage,
      priority,
      clientid: clientId,
    });

    return {
      tid: data.tid,
      ticketId: data.id,
      c: data.c,
    };
  }

  // ---- אם הלקוח לא קיים → חובה לשלוח name + clientemail ----
  const name =
    discordUser?.globalName ||
    discordUser?.username ||
    "Discord User";

  const data = await callWhmcs("OpenTicket", {
    deptid,
    subject: safeSubject,
    message: safeMessage,
    priority,
    clientemail: email,
    name,
  });

  return {
    tid: data.tid,
    ticketId: data.id,
    c: data.c,
  };
}

// ------------------------------------------------------
// ייצוא הפונקציות לשימוש ב-index.js
// ------------------------------------------------------
module.exports = {
  callWhmcs,
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
  openSupportTicket,
};
