// index.js
const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

require("dotenv").config();

// משתני סביבה
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error("❌ Missing TOKEN env variable.");
  process.exit(1);
}

// יוצרים Client עם אינטנטים בסיסיים
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const PREFIX = "!";

// כשהבוט עולה
client.once("ready", () => {
  console.log(`🔥 Bot is online as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "isrServ game servers", type: 0 }],
    status: "online"
  });
});

// ----- טיפול ב-Slash Commands -----

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "status") {
      await interaction.reply("🎮 סטטוס שרתי המשחק (דמו) – בקרוב חיבור ל-API 🙂");
    }

    if (interaction.commandName === "renew") {
      await interaction.reply({
        content: "🔁 לחידוש מנוי לשרת המשחק: https://isrserv.co.il/renew",
        ephemeral: true
      });
    }

    if (interaction.commandName === "verify") {
      await interaction.reply({
        content: "✅ דמו: אימות מנוי. בהמשך נחבר ל-API וניתן רולים אוטומטיים.",
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("Slash command error:", err);
    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ אירעה שגיאה בעת ביצוע הפקודה.",
        ephemeral: true
      });
    }
  }
});

// ----- פקודות ישנות עם ! -----

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    const sent = await message.reply("🏓 מודד פינג...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`🏓 Pong! latency ~ **${latency}ms**`);
  }

  if (command === "help") {
    await message.reply(
      [
        "🤖 **פקודות זמינות:**",
        "`!ping` – בדיקת פינג",
        "`/status` – סטטוס שרתי משחק (דמו)",
        "`/renew` – קישור לחידוש מנוי",
        "`/verify` – אימות מנוי (דמו)"
      ].join("\n")
    );
  }
});

// התחברות
client.login(TOKEN);
