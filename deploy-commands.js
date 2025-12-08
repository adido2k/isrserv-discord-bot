// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const { TOKEN, GUILD_ID } = process.env;

if (!TOKEN || !GUILD_ID) {
  console.error("❌ Missing TOKEN or GUILD_ID in environment variables");
  process.exit(1);
}

const commands = [

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("מציג סטטוס של השרתים שלך"),

  new SlashCommandBuilder()
    .setName("renew")
    .setDescription("מקבל קישור לחידוש מנוי"),

  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("אימות חשבון וקבלת רולים"),

  new SlashCommandBuilder()
    .setName("myservers")
    .setDescription("רשימת כל השרתים שקנית באתר"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("רשימת כל הפקודות הזמינות"),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("פתיחת טיקט תמיכה"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    const app = await rest.get(Routes.oauth2CurrentApplication());

    await rest.put(
      Routes.applicationGuildCommands(app.id, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered successfully.");
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
