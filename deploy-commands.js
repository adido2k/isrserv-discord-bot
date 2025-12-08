// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const { TOKEN, GUILD_ID } = process.env;

if (!TOKEN || !GUILD_ID) {
  console.error("Missing TOKEN or GUILD_ID env vars.");
  process.exit(1);
}

// מגדירים את 3 ה־Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("מציג סטטוס של שרתי המשחק"),

  new SlashCommandBuilder()
    .setName("renew")
    .setDescription("קישור לחידוש מנוי לשרת המשחק"),

  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("אימות מנוי וקבלת רולים מתאימים"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        (await rest.get(Routes.oauth2CurrentApplication())).id,
        GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Slash commands registered successfully.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
