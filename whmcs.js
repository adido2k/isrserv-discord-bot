// whmcs.js – גרסה שעובדת דרך discord_api.php (localAPI)

// אין לנו צורך כבר ב-Identifier/Secret
const axios = require("axios");

// ⬅️ הוספת IP קבוע (רק אם אתה רוצה לעדכן IP ידני)
axios.defaults.headers['X-Forwarded-For'] = '149.248.193.67';

// כתובת הפרוקסי ב-WHMCS (לא צריך לשנות כלום כאן)
const WHMCS_URL = "https://panel.isrserv.com/whmcs/discord_api.php";

// מחלקות תמיכה (מזהי מחלקות מה-Environment של Railway)
const SUPPORT_DEPARTMENT_ID          = process.env.SUPPORT_DEPARTMENT_ID;          
const SUPPORT_DEPARTMENT_GAMESERVERS = process.env.SUPPORT_DEPARTMENT_GAMESERVERS; 
const SUPPORT_DEPARTMENT_BILLING     = process.env.SUPPORT_DEPARTMENT_BILLING;     
const SUPPORT_DEPARTMENT_ABUSE       = process.env.SUPPORT_DEPARTMENT_ABUSE;       

// -----------------------------------------------------
// קריאה כללית ל-WHMCS דרך הפרוקסי (discord_api.php)
// -----------------------------------------------------
async function callWhmcs(action, params = {}) {
  const data = {
    action,
    ...params,
  };

  const res = await axios.post(
    WHMCS_URL,
    new URLSearchParams(data).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    }
  );

  if (!res.data || res.data.result !== "success") {
    console.error("WHMCS error response:", res.data);
    throw new Error(
      (res.data && (res.data.message || res.data.result)) ||
      "Unknown WHMCS error"
    );
  }

  return res.data;
}

// ----------------- סטטוס שירות -----------------
async function getServiceStatus(serviceId) {
  const data = await callWhmcs("GetClientsProducts", { serviceid: serviceId });

  const product = data.products?.product?.[0] || null;
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
  return `${process.env.CLIENT_AREA_URL}/clientarea.php?action=productdetails&id=${serviceId}`;
}

// ----------------- אימות לקוח לפי מייל -----------------
async function verifyClientByEmail(email) {
  const clientData = await callWhmcs("GetClientsDetails", { email, stats: true });
  const clientId = clientData.clientid;

  const productsData = await callWhmcs("GetClientsProducts", {
    clientid: clientId,
    status: "Active",
  });

  return {
    clientId,
    activeServices: productsData.products?.product || [],
  };
}

// ----------------- בחירת מחלקת תמיכה -----------------
function getDeptIdByKey(key) {
  switch (key) {
    case "gameservers": return SUPPORT_DEPARTMENT_GAMESERVERS || SUPPORT_DEPARTMENT_ID;
    case "billing":     return SUPPORT_DEPARTMENT_BILLING || SUPPORT_DEPARTMENT_ID;
    case "abuse":       return SUPPORT_DEPARTMENT_ABUSE || SUPPORT_DEPARTMENT_ID;
    case "general":
    default:            return SUPPORT_DEPARTMENT_ID;
  }
}

// ----------------- פתיחת טיקט תמיכה -----------------
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
    message || "פניה נפתחה דרך הבוט בדיסקורד (לא סופק טקסט הודעה מפורט).";

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

  return {
    tid: data.tid,
    ticketId: data.id,
    c: data.c,
  };
}

module.exports = {
  callWhmcs,
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
  openSupportTicket,
};
