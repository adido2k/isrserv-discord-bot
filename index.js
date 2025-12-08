// index.js
const {
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const axios = require("axios");

// קריאה למשתני סביבה
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_KEY = process.env.API_KEY || "";

if (!TOKEN) {
  console.error("❌ Missing TOKEN env variable. Set TOKEN in Railway.");
  process.exit(1);
}

// יצירת Client עם אינטנטים כולל חברי שרת (בשביל רולים)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // חובה בשביל רולים
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const PREFIX = "!";

// --------- עוזרים כלליים ---------

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

// דוגמה לשרתים סטטיים – אפשר להשאיר / לשלב עם API
const fallbackGameServers = [
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
];

// --------- חיבור ל־API של האתר שלך ---------

async function fetchServerStatus() {
  // אם אין API מוגדר – נחזיר את הסטטי
  if (!API_BASE_URL) {
    return fallbackGameServers;
  }

  try {
    const res = await axios.get(`${API_BASE_URL}/servers/status`, {
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
      timeout: 5000,
    });

    // מצפה למשהו בסגנון:
    // [{ name, ip, playersOnline, maxPlayers, status }]
    return res.data;
  } catch (err) {
    console.error("Error fetching server status from API:", err.message);
    // במקרה של תקלה – נ fallback לסטטי
    return fallbackGameServers;
  }
}

// בדיקת מנוי לפי Discord ID
async function checkSubscription(discordId) {
  if (!API_BASE_URL) {
    // מצב ללא API – פשוט מחזירים מנוי דמיוני לדוגמה
    return {
      active: true,
      plan: "Demo",
      roleName: "Customer",
    };
  }

  try {
    const res = await axios.get(
      `${API_BASE_URL}/subscriptions/discord/${discordId}`,
      {
        headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
        timeout: 5000,
      }
    );

    // מצפים למשהו כמו: { active: true, plan: 'Pro', roleName: 'Pro Customer' }
    return res.data;
  } catch (err) {
    console.error("Error checking subscription:", err.message);
    return { active: false };
  }
}

// --------- אירוע Ready ---------

client.once("ready", () => {
  console.log(`🔥 Bot is online as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "isrServ game servers", type: 0 }],
    status: "online",
  });
});

// --------- Slash Commands ---------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "status") {
      await handleSlashStatus(interaction);
    } else if (interaction.commandName === "renew") {
      await handleSlashRenew(interaction);
    } else if (interaction.commandName === "verify") {
      await handleSlashVerify(interaction);
    }
  } catch (err) {
    console.error("Slash command error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "❌ אירעה שגיאה בעת ביצוע הפקודה.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "❌ אירעה שגיאה בעת ביצוע הפקודה.",
        ephemeral: true,
      });
    }
  }
});

async function handleSlashStatus(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const servers = await fetchServerStatus();
  if (!servers || !servers.length) {
    await interaction.editReply("לא נמצאו שרתי משחק.");
    return;
  }

  const lines = servers.map((s) => {
    const statusText =
      s.status === "online" || s.online
        ? "🟢 Online"
        : s.status === "offline"
        ? "🔴 Offline"
        : "🟡 Unknown";

    const players =
      s.playersOnline != null && s.maxPlayers
        ? ` | שחקנים: ${s.playersOnline}/${s.maxPlayers}`
        : "";

    return `**${s.name}** – \`${s.ip}\`\n${statusText}${players}${
      s.note ? ` – ${s.note}` : ""
    }`;
  });

  await interaction.editReply(
    "🎮 **סטטוס שרתי המשחק של isrServ:**\n\n" + lines.join("\n\n")
  );
}

async function handleSlashRenew(interaction) {
  // פה אתה שם את קישור החידוש מהאתר שלך
  const renewUrl = "https://isrserv.co.il/renew"; // שנה לכתובת שלך

  await interaction.reply({
    content:
      "🔁 לחידוש מנוי לשרת המשחק שלך, היכנס ללינק הבא:\n" + renewUrl,
    ephemeral: true,
  });
}

async function handleSlashVerify(interaction) {
  if (!interaction.guild || !GUILD_ID || interaction.guild.id !== GUILD_ID) {
    await interaction.reply({
      content: "פקודה זו זמינה רק בשרת הראשי של isrServ.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member; // GuildMember
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  const sub = await checkSubscription(discordId);

  if (!sub || !sub.active) {
    await interaction.editReply(
      "❌ לא נמצא מנוי פעיל המשויך לחשבון הדיסקורד שלך.\nאם רכשת שרת – ודא שקישרת את חשבון הדיסקורד לאתר."
    );
    return;
  }

  // נסה למצוא רול לפי שם
  const roleName = sub.roleName || "Customer";
  const guild = interaction.guild;
  let role = guild.roles.cache.find((r) => r.name === roleName);

  // אין רול? ניצור
  if (!role) {
    role = await guild.roles.create({
      name: roleName,
      color: "Aqua",
      reason: "Created for isrServ subscription role",
    });
  }

  // הוספת הרול למשתמש
  try {
    await member.roles.add(role);
  } catch (err) {
    console.error("Error adding role:", err);
    await interaction.editReply(
      "המנוי אומת, אבל לא הצלחתי להוסיף לך את הרול (הרשאות חסרות?)."
    );
    return;
  }

  await interaction.editReply(
    `✅ המנוי שלך אומת בהצלחה!\nתכנית: **${sub.plan || "Unknown"}**\nקיבלת רול: **${role.name}**`
  );
}

// --------- פקודות Prefix ישנות (!ping וכו') – אם אתה רוצה להשאיר ---------

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    const sent = await message.reply("🏓 מודד פינג...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`🏓 Pong! latency ~ **${latency}ms**`);
    return;
  }

  if (command === "help") {
    await message.reply(
      [
        "🤖 **פקודות זמינות:**",
        "`!ping` – פינג",
        "`/status` – סטטוס שרתי משחק",
        "`/renew` – קישור לחידוש מנוי",
        "`/verify` – אימות מנוי וקבלת רול",
      ].join("\n")
    );
    return;
  }
});

// התחברות
client.login(TOKEN);
