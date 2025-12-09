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

// מחלקות תמיכה (IDs מה־Environment של Railway)
const SUPPORT_DEPARTMENT_ID = process.env.SUPPORT_DEPARMENT_ID; // General
const SUPPORT_DEPARTMENT_GAMESERVERS =
  process.env.SUPPORT_DEPARMENT_GAMESERVERS; // Game Servers
const SUPPORT_DEPARTMENT_BILLING =
  process.env.SUPPORT_DEPARMENT_BILLING; // Billing
const SUPPORT_DEPARTMENT_ABUSE = process.env.SUPPORT_DEPARMENT_ABUSE; // Abuse

// פונקציה כללית לקריאה ל-WHMCS דרך ה-PHP שלך
async function callWhmcs(action, params = {}) {
  try {
    const body = new URLSearchParams();
    body.append("action", action);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    }

    const response = await axios.post(WHMCS_URL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000,
    });

    return response.data;
  } catch (err) {
    console.error("[WHMCS] error or timeout:", err.message);
    throw err;
  }
}

// דוגמה: פתיחת טיקט תמיכה
async function openSupportTicket({
  name,
  email,
  subject,
  message,
  department = "general",
}) {
  let deptId = SUPPORT_DEPARTMENT_ID;

  if (department === "gameservers") {
    deptId = SUPPORT_DEPARTMENT_GAMESERVERS;
  } else if (department === "billing") {
    deptId = SUPPORT_DEPARTMENT_BILLING;
  } else if (department === "abuse") {
    deptId = SUPPORT_DEPARTMENT_ABUSE;
  }

  const result = await callWhmcs("OpenTicket", {
    deptid: deptId,
    subject,
    message,
    // אם תגדיר לקוחות ב-WHMCS:
    // clientname: name,
    // clientemail: email,
  });

  if (result.result !== "success") {
    console.error("[WHMCS] error response:", result);
  } else {
    console.log("[WHMCS] ticket opened:", result.ticketid || result);
  }

  return result;
}

module.exports = {
  callWhmcs,
  openSupportTicket,
};
