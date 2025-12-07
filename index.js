// index.js
const { Client, GatewayIntentBits } = require("discord.js");

// יצירת Client עם האינטנטים הדרושים
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// הטוקן מה־Environment
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TOKEN env variable. Set TOKEN in Railway.");
  process.exit(1);
}

const PREFIX = "!";

// שרתי משחק לדוגמה – תעדכן לפי מה שיש לך בפועל
const gameServers = [
  {
    name: "FiveM Roleplay",
    ip: "fivem.isrserv.co.il:30120",
    note: "שרת RP ראשי",
  },
  {
    name: "CS2 Competitive",
    ip: "cs2.isrserv.co.il:27015",
    note: "תחרותי 128 tick",
  },
  {
    name: "Minecraft Survival",
    ip: "mc.isrserv.co.il:25565",
    note: "Survival + Plugins",
  },
];

// כשהבוט עולה
client.once("ready", () => {
  console.log(`🔥 Bot is online as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "isrServ game servers", type: 0 }],
    status: "online",
  });
});

// פונקציה לעיצוב זמן ריצה
function formatDuration(seconds) {
  const d = Math.floor(seconds / (60 * 60 * 24));
  const h = Math.floor((seconds % (60 * 60 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

// מאזין להודעות
client.on("messageCreate", async (message) => {
  // לא מגיב לבוטים / בלי prefix
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // --------- פקודות ---------

  // !ping – בודק latency
  if (command === "ping") {
    const sent = await message.reply("🏓 מודד פינג...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    sent.edit(`🏓 Pong! latency ~ **${latency}ms**`);
    return;
  }

  // !status – סטטוס כללי
  if (command === "status") {
    const guildCount = client.guilds.cache.size;
    message.reply(
      `✅ הבוט מחובר ורץ.\nשרתים מחוברים: **${guildCount}**\nריצה רצופה: **${formatDuration(
        process.uptime()
      )}**`
    );
    return;
  }

  // !uptime – כמה זמן הבוט רץ
  if (command === "uptime") {
    message.reply(`⏱️ הבוט רץ כבר: **${formatDuration(process.uptime())}**`);
    return;
  }

  // !serverinfo – מידע על השרת הנוכחי
  if (command === "serverinfo") {
    const guild = message.guild;
    if (!guild) {
      message.reply("❌ פקודה זו עובדת רק בתוך שרת, לא בפרטי.");
      return;
    }

    message.reply(
      [
        `📡 **מידע על השרת:**`,
        `שם: **${guild.name}**`,
        `חברים: **${guild.memberCount}**`,
        `ערוצי טקסט/קול: **${guild.channels.cache.size}**`,
        `נוצר בתאריך: ${guild.createdAt.toLocaleDateString("he-IL")}`,
      ].join("\n")
    );
    return;
  }

  // !userinfo – מידע על משתמש
  if (command === "userinfo") {
    const user =
      message.mentions.users.first() ||
      message.author; // אם אין mention – המשתמש עצמו

    message.reply(
      [
        `👤 **מידע על משתמש:**`,
        `שם: **${user.tag}**`,
        `ID: \`${user.id}\``,
        `נוצר בתאריך: ${user.createdAt.toLocaleDateString("he-IL")}`,
      ].join("\n")
    );
    return;
  }

  // !servers – רשימת שרתי משחק
  if (command === "servers") {
    if (!gameServers.length) {
      message.reply("כרגע אין שרתי משחק מוגדרים.");
      return;
    }

    const lines = gameServers.map(
      (srv, i) =>
        `**${i + 1}. ${srv.name}**\nIP: \`${srv.ip}\`${srv.note ? ` – ${srv.note}` : ""}`
    );

    message.reply(
      "🎮 **שרתי המשחק של isrServ:**\n\n" +
        lines.join("\n\n") +
        "\n\nאם יש בעיה בחיבור – פנה לתמיכה עם צילום מסך."
    );
    return;
  }

  // !website – קישור לאתר
  if (command === "website") {
    message.reply("🌐 אתר isrServ: https://isrserv.co.il");
    return;
  }

  // !support – קישור לתמיכה
  if (command === "support") {
    // תעדכן כאן ל־Discord / טיקט / מייל שלך
    const supportLink = "https://discord.gg/YOUR_SUPPORT"; // <<< שנה
    const email = "isrsupport@isrserv.co.il"; // <<< שנה אם צריך

    message.reply(
      `🆘 **תמיכה ב־isrServ**\nדיסקורד: ${https://discord.gg/Ydp4kWXQ}\nמייל: ${email}`
    );
    return;
  }

  // !help – רשימת פקודות
  if (command === "help") {
    message.reply(
      [
        "🤖 **פקודות זמינות בבוט isrServ:**",
        "`!ping` – בדיקת פינג ו־latency",
        "`!status` – סטטוס הבוט",
        "`!uptime` – כמה זמן הבוט רץ",
        "`!serverinfo` – מידע על השרת הנוכחי",
        "`!userinfo [@user]` – מידע על משתמש",
        "`!servers` – רשימת שרתי המשחק",
        "`!website` – קישור לאתר isrserv.co.il",
        "`!support` – קישור לתמיכה",
        "`!help` – רשימת הפקודות הזאת 😉",
      ].join("\n")
    );
    return;
  }
});

// התחברות לדיסקורד
client.login(TOKEN);
