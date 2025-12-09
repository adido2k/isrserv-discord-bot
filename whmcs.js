// whmcs.js
// ------------------------------------------------------
// אינטגרציה בין הבוט ל-WHMCS דרך discord_api.php (localAPI)
// אין צורך ב-IP, רק בכתובת HTTPS עובדת.
// ------------------------------------------------------

const axios = require("axios");

// כתובת הפרוקסי ב-WHMCS
// אם תגדיר ENV בשם WHMCS_URL – הוא ישתמש בו.
// אחרת הוא ישתמש בכתובת הקבועה למטה.
const WHMCS_URL =
  process.env.WHMCS_URL ||
  "https://panel.isrserv.com/whmcs/discord_api.php";

// מחלקות תמיכה (IDs מה־WHMCS שלך)
const SUPPORT_DEPARTMENT_ID = process.env.SUPPORT_DEPARTMENT_ID || 1; // כללי
const SUPPORT_DEPARTMENT_GAMESERVERS =
  process.env.SUPPORT_DEPARTMENT_GAMESERVERS || 2; // Gameservers
const SUPPORT_DEPARTMENT_BILLING =
  process.env.SUPPORT_DEPARTMENT_BILLING || 3; // Billing
const SUPPORT_DEPARTMENT_ABUSE =
  process.env.SUPPORT_DEPARTMENT_ABUSE || 4; // Abuse

// פונקציית בסיס ששולחת בקשות ל-discord_api.php
async function callWhmcs(action, params = {}) {
  try {
    const body = new URLSearchParams({ action, ...params });

    const res = await axios.post(WHMCS_URL, body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000,
    });

    if (!res.data) {
      throw new Error("Empty response from WHMCS");
    }

    if (res.data.result === "error") {
      throw new Error(res.data.message || "WHMCS returned error");
    }

    return res.data;
  } catch (err) {
    console.error("[WHMCS] callWhmcs error:", err.message);
    throw err;
  }
}

// ------------------------------------------------------
// פתיחת טיקט חדש
// ------------------------------------------------------
async function openTicket({
  name,
  email,
  subject,
  message,
  priority = "Medium",
  department = "general",
}) {
  // ממפה שם מחלקה ל-ID
  let deptId = SUPPORT_DEPARTMENT_ID;

  switch (department) {
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
  }

  const data = await callWhmcs("OpenTicket", {
    deptid: String(deptId),
    name,
    email,
    subject,
    message,
    priority,
  });

  return data; // צפוי לכלול ticketid וכו'
}

// ------------------------------------------------------
// דוגמה לפונקציה להבאת פרטי לקוח לפי מייל
// (אם תרצה להרחיב אינטגרציה בהמשך)
// ------------------------------------------------------
async function getClientByEmail(email) {
  const data = await callWhmcs("GetClientsDetails", {
    email,
    stats: false,
  });

  return data;
}

module.exports = {
  openTicket,
  getClientByEmail,
};
