// deploy-commands.js
// רישום Slash Commands לדיסקורד – רק לשרת אחד (GUILD_ID)
// וגם ניקוי כל הפקודות הגלובליות כדי שלא יהיו כפילויות.

const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const { TOKEN, GUILD_ID } = process.env;

if (!TOKEN || !GUILD_ID) {
  console.error("❌ Missing TOKEN or GUILD_ID env vars.");
  process.exit(1);
}

// ---------------------------------------------------------------------
// הגדרת כל ה־Slash Commands של הבוט
// ---------------------------------------------------------------------

// /status
const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("בדיקת סטטוס של שירות ב-WHMCS לפי service_id")
  .addStringOption((option) =>
    option
      .setName("service_id")
      .setDescription("מספר השירות (service_id) מתוך WHMCS")
      .setRequired(true)
  );

// /renew
const renewCommand = new SlashCommandBuilder()
  .setName("renew")
  .setDescription("קבלת לינק לחידוש שירות ב-WHMCS לפי service_id")
  .addStringOption((option) =>
    option
      .setName("service_id")
      .setDescription("מספר השירות (service_id) מתוך WHMCS")
      .setRequired(true)
  );

// /verify
const verifyCommand = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("אימות לקוח לפי כתובת מייל והוספת רול מאומת")
  .addStringOption((option) =>
    option
      .setName("email")
      .setDescription("האימייל הרשום בחשבון הלקוח ב-WHMCS")
      .setRequired(true)
  );

// /ticket
const ticketCommand = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("פתיחת טיקט תמיכה ב-WHMCS")
  .addStringOption((option) =>
    option
      .setName("department")
      .setDescription("מחלקת התמיכה")
      .setRequired(true)
      .addChoices(
        { name: "תמיכה כללית", value: "general" },
        { name: "שרתים / Gameservers", value: "gameservers" },
        { name: "חיוב ותשלומים", value: "billing" },
        { name: "Abuse / תלונות", value: "abuse" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("subject")
      .setDescription("נושא הטיקט")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("email")
      .setDescription("האימייל שבו תרצה שנחזור אליך")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("תיאור הבעיה / הפניה")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("priority")
      .setDescription("עדיפות הטיקט")
      .setRequired(false)
      .addChoices(
        { name: "Low", value: "Low" },
        { name: "Medium", value: "Medium" },
        { name: "High", value: "High" }
      )
  );

// כל הפקודות כ־JSON
const commands = [
  statusCommand,
  renewCommand,
  verifyCommand,
  ticketCommand,
].map((cmd) => cmd.toJSON());

// ---------------------------------------------------------------------
// רישום הפקודות
// ---------------------------------------------------------------------

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands…");

    // מזהה האפליקציה (הבוט)
    const app = await rest.get(Routes.oauth2CurrentApplication());
    const appId = app.id;

    // 1. ניקוי כל ה־Slash Commands הגלובליים כדי שלא יהיו כפילויות
    console.log("🧹 Clearing GLOBAL commands…");
    await rest.put(Routes.applicationCommands(appId), { body: [] });
    console.log("✅ Global commands cleared.");

    // 2. רישום הפקודות רק לשרת הספציפי
    console.log(`📥 Registering GUILD commands for guild ${GUILD_ID}…`);
    await rest.put(Routes.applicationGuildCommands(appId, GUILD_ID), {
      body: commands,
    });
    console.log("✅ Guild commands registered successfully.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
