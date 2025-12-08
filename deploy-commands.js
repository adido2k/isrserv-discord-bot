// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const { TOKEN, GUILD_ID } = process.env;

if (!TOKEN || !GUILD_ID) {
  console.error("Missing TOKEN or GUILD_ID env vars.");
  process.exit(1);
}

// כל ה-Slash Commands של הבוט
const commands = [
  // /status
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("מציג סטטוס של שירות לפי service_id ב-WHMCS")
    .addStringOption((opt) =>
      opt
        .setName("service_id")
        .setDescription("ה-ID של השירות ב-WHMCS")
        .setRequired(true)
    ),

  // /renew
  new SlashCommandBuilder()
    .setName("renew")
    .setDescription("קישור לחידוש מנוי עבור שירות")
    .addStringOption((opt) =>
      opt
        .setName("service_id")
        .setDescription("ה-ID של השירות ב-WHMCS")
        .setRequired(true)
    ),

  // /verify
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("אימות לקוח לפי מייל והוספת רול מאומת")
    .addStringOption((opt) =>
      opt
        .setName("email")
        .setDescription("האימייל של הלקוח ב-WHMCS")
        .setRequired(true)
    ),

  // /ticket – פתיחת טיקט תמיכה
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("פתיחת טיקט תמיכה ב-WHMCS")
    .addStringOption((opt) =>
      opt
        .setName("department")
        .setDescription("מחלקה")
        .addChoices(
          { name: "Gameservers", value: "gameservers" },
          { name: "Billing / תשלומים", value: "billing" },
          { name: "Abuse / תלונות", value: "abuse" },
          { name: "General / כללי", value: "general" }
        )
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("subject")
        .setDescription("נושא הטיקט")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("תוכן הפניה")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("email")
        .setDescription("אימייל ליצירת קשר (חייב להיות כמו ב-WHMCS אם קיים לקוח)")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("priority")
        .setDescription("עדיפות")
        .addChoices(
          { name: "Low", value: "Low" },
          { name: "Medium", value: "Medium" },
          { name: "High", value: "High" }
        )
        .setRequired(false)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    const app = await rest.get(Routes.oauth2CurrentApplication());

    await rest.put(Routes.applicationGuildCommands(app.id, GUILD_ID), {
      body: commands,
    });

    console.log("✅ Slash commands registered successfully.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
