// whmcs.js
const axios = require('axios');

const WHMCS_URL        = process.env.WHMCS_URL;        // למשל: https://billing.isrserv.co.il/includes/api.php
const WHMCS_IDENTIFIER = process.env.WHMCS_IDENTIFIER; // API Identifier
const WHMCS_SECRET     = process.env.WHMCS_SECRET;     // API Secret
const WHMCS_ACCESS_KEY = process.env.WHMCS_ACCESS_KEY; // אם מוגדר אצלך (לא חובה בכל התקנות)

async function callWhmcs(action, params = {}) {
  const data = {
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    accesskey: WHMCS_ACCESS_KEY,
    action,
    responsetype: 'json',
    ...params
  };

  const res = await axios.post(WHMCS_URL, new URLSearchParams(data).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (res.data.result !== 'success') {
    throw new Error(`WHMCS error: ${res.data.message || res.data.result}`);
  }

  return res.data;
}

// דוגמא: בדיקת שירות לפי service_id (ID של product/service)
async function getServiceStatus(serviceId) {
  const data = await callWhmcs('GetClientsProducts', {
    serviceid: serviceId
  });

  const product = data.products.product?.[0];
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    status: product.status,        // Active / Suspended / etc
    nextDueDate: product.nextduedate
  };
}

// קבלת לינק לחידוש מנוי (פשטני – לפי invoice שאמור להיות פתוח)
async function getRenewLinkByService(serviceId) {
  // זה רק דוגמא – במציאות אפשר לעשות GetInvoices ולחפש invoice פתוח
  // כאן נחזיר לינק כללי לאיזור הלקוח עם פוקוס על השירות
  return `${process.env.CLIENT_AREA_URL}/clientarea.php?action=productdetails&id=${serviceId}`;
}

// אימות לפי אימייל: מחזיר clientId ומספר שירותים פעילים
async function verifyClientByEmail(email) {
  const clientData = await callWhmcs('GetClientsDetails', {
    email,
    stats: true
  });

  const clientId = clientData.clientid;

  const productsData = await callWhmcs('GetClientsProducts', {
    clientid: clientId,
    status: 'Active'
  });

  return {
    clientId,
    activeServices: productsData.products.product || []
  };
}

module.exports = {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail
};
