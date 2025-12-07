// index.js
const { Client, GatewayIntentBits } = require("discord.js");

// יוצרים Client עם האינטנטים הבסיסיים
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// הטוקן נקרא מ־Environment Variable בשם TOKEN
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TOKEN env variable. Set TOKEN in Railway/GitHub.");
  process.exit(1);
}

// כשהבוט עולה
client.once("ready", () => {
  console.log(`🔥 Bot is online as ${client.user.tag}`);

  // סטטוס קטן
  client.user.setPresence({
    activities: [{ name: "isrServ game servers", type: 0 }],
    status: "online",
  });
});

// פקודות טקסט בסיסיות לבדיקה
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  // בדיקת חיים
  if (message.content === "!ping") {
    message.reply("🏓 Pong! הבוט פעיל ✔");
  }

  // בדיקת סטטוס
  if (message.content === "!status") {
    message.reply("🔧 הבוט מחובר ורץ תקין על Railway.");
  }

  // עזרה בסיסית
  if (message.content === "!help") {
    message.reply(
      "🤖 פקודות בדיקה זמינות:\n" +
      "`!ping` – בדיקת חיים\n" +
      "`!status` – סטטוס הבוט\n" +
      "`!help` – רשימת פקודות"
    );
  }
});

// חיבור לדיסקורד
client.login(TOKEN);
