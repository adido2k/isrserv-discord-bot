// whmcs.js
// ------------------------------------------------------
// אינטגרציה בין הבוט ל-WHMCS דרך discord_api.php (localAPI)
// כולל טיפול ב-self-signed certificate (לצורכי בדיקות – לא מומלץ לפרודקשן).
// ------------------------------------------------------

const axios = require("axios");
const https = require("https");

// האם לאפשר self-signed certificate
// אם תרצה לכבות בעתיד: שנה ל-false או השתמש ב-ENV
const ALLOW_SELF_SIGNED =
  process.env.ALLOW_SELF_SIGNED_SSL === "1" || true;

// Agent שמתעלם מהבדיקת תעודה כשצריך
const httpsAgent = new https.Agent({
  rejectUnauthorized: !ALLOW_SELF_SIGNED,
});

// כתובת הפרוקסי ב-WHMCS (discord_api.php)
const WHMCS_URL =
  process.env.WHMCS_URL ||
  "https://panel.isrserv.com/whmcs/discord_api.php";

// ------------------------------------------------------
// מחלקות תמיכה (IDs ב-WHMCS) – לפי המיפוי ששלחת:
// General Enquiries      = 1
// isrSupport             = 2  (כרגע לא בשימוש בבוט)
// Game Servers Support   = 3
// Billing & Payments     = 4
// Abuse / Reports        = 5
// ------------------------------------------------------
const SUPPORT_DEPARTMENT_GENERAL =
  process.env.SUPPORT_DEPARTMENT_GENERAL || 1; // General Enquiries
const SUPPORT_DEPARTMENT_GAMESERVERS =
  process.env.SUPPORT_DEPARTMENT_GAMESERVERS || 3; // Game Servers Support
const SUPPORT_DEPARTMENT_BILLING =
  process.env.SUPPORT_DEPARTMENT_BILLING || 4; // Billing & Payments
const SUPPORT_DEPARTMENT_ABUSE =
  process.env.SUPPORT_DEPARTMENT_ABUSE || 5; // Abuse / Reports

// ------------------------------------------------------
// פונקציה כללית שקוראת ל-discord_api.php
// ------------------------------------------------------
async function callWhmcs(action, params = {}) {
  try {
    const body = new URLSearchParams({ action, ...params });

    const res = await axios.post(WHMCS_URL, body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000,
      httpsAgent,
    });

    if (!res.data) {
      throw new Error("Empty response from WHMCS");
    }

    if (res.data.result === "error") {
      throw new Error(res.data.message || "WHMCS returned error");
    }

    return res.data;
  } catch (err) {
    console.error("[WHMCS] error or timeout:", err.message);
    throw err;
  }
}

// ------------------------------------------------------
// פונקציה בסיסית לפתיחת טיקט
// ------------------------------------------------------
async function openTicket({
  name,
  email,
  subject,
  message,
  priority = "Medium",
  department = "general",
}) {
  // ברירת מחדל – מחלקה כללית
  let deptId = SUPPORT_DEPARTMENT_GENERAL;

  switch (department.toLowerCase()) {
    case "games":
    case "gameservers":
      deptId = SUPPORT_DEPARTMENT_GAMESERVERS;
      break;

    case "billing":
      deptId = SUPPORT_DEPARTMENT_BILLING;
      break;

    case "abuse":
      deptId = SUPPORT_DEPARTMENT_ABUSE;
      break;

    // אפשר להוסיף כאן case "support": deptId = 2; אם תרצה בעתיד
    // אחרת – נשארים על הכללי (1)
  }

  const data = await callWhmcs("OpenTicket", {
    deptid: String(deptId),
    name,
    email,
    subject,
    message,
    priority,
  });

  return data;
}

// ------------------------------------------------------
// wrapper בשם openSupportTicket כדי להתאים לקוד הקיים בבוט
// ------------------------------------------------------
async function openSupportTicket(options) {
  // options צפוי להיות אובייקט { name, email, subject, message, priority, department }
  return openTicket(options);
}

// ------------------------------------------------------
// פונקציה לדוגמה – קבלת פרטי לקוח לפי אימייל
// ------------------------------------------------------
async function getClientByEmail(email) {
  const data = await callWhmcs("GetClientsDetails", {
    email,
    stats: false,
  });

  return data;
}

// מה נייצא לקבצים אחרים (index.js וכו')
module.exports = {
  openSupportTicket,
  getClientByEmail,
};
