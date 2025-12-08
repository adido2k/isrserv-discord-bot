// index.js
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require('discord.js');

const {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail,
  openSupportTicket,
} = require('./whmcs');

// יצירת לקוח דיסקורד
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// משתנים מסביבת העבודה
const GUILD_ID = process.env.GUILD_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const CLIENT_AREA_URL = process.env.CLIENT_AREA_URL;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --------------------------------------------------------
//                Slash Commands handler
// --------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'status':
        await handleStatus(interaction);
        break;
      case 'renew':
        await handleRenew(interaction);
        break;
      case 'verify':
        await handleVerify(interaction);
        break;
      case 'ticket':
        await handleTicket(interaction);
        break;
    }
  } catch (err) {
    console.error('Command error:', err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ אירעה שגיאה בעת ביצוע הפקודה.',
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: '❌ אירעה שגיאה בעת ביצוע הפקודה.',
        ephemeral: true,
      });
    }
  }
});

// --------------------------------------------------------
// /status – בודק סטטוס שירות
// --------------------------------------------------------
async function handleStatus(interaction) {
  const serviceId = interaction.options.getString('service_id');

  await interaction.deferReply({ ephemeral: true });

  if (!serviceId) {
    return interaction.editReply('ℹ אנא ספק service_id תקין.');
  }

  const status = await getServiceStatus(serviceId);

  if (!status) {
    return interaction.editReply('❌ לא נמצא שירות עם ה-ID שסיפקת.');
  }

  await interaction.editReply(
    `🖥 **סטטוס שירות #${status.id}**\n` +
    `שם: **${status.name}**\n` +
    `סטטוס: **${status.status}**\n` +
    `תאריך חידוש: **${status.nextDueDate}**`
  );
}

// --------------------------------------------------------
// /renew – מחזיר לינק לחידוש
// --------------------------------------------------------
async function handleRenew(interaction) {
  const serviceId = interaction.options.getString('service_id');

  await interaction.deferReply({ ephemeral: true });

  if (!serviceId) {
    return interaction.editReply('ℹ אנא ספק service_id תקין.');
  }

  const link = await getRenewLinkByService(serviceId);

  await interaction.editReply(
    `🔁 לינק לחידוש מנוי עבור שירות #${serviceId}:\n${link}`
  );
}

// --------------------------------------------------------
// /verify – מאמת לפי מייל ומוסיף רול
// --------------------------------------------------------
async function handleVerify(interaction) {
  const email = interaction.options.getString('email');

  await interaction.deferReply({ ephemeral: true });

  const verifyResult = await verifyClientByEmail(email);

  if (!verifyResult || !verifyResult.activeServices.length) {
    return interaction.editReply('❌ לא נמצאו שירותים פעילים עבור המייל הזה.');
  }

  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(interaction.user.id);

  if (VERIFIED_ROLE_ID) {
    const role = await guild.roles.fetch(VERIFIED_ROLE_ID);
    if (role && !member.roles.cache.has(role.id)) {
      await member.roles.add(role);
    }
  }

  await interaction.editReply(
    `✅ נמצא לקוח עם ID ${verifyResult.clientId} ו-${verifyResult.activeServices.length} שירותים פעילים.\n` +
      `הרול המתאים נוסף לך (אם מוגדר).`
  );
}

// --------------------------------------------------------
// /ticket – פתיחת טיקט ב-WHMCS דרך proxy
// --------------------------------------------------------
async function handleTicket(interaction) {
  const department = interaction.options.getString('department');
  const subject = interaction.options.getString('subject');
  const email = interaction.options.getString('email');
  const message = interaction.options.getString('message');
  const priority = interaction.options.getString('priority') || 'Medium';

  console.log('[/ticket] received', {
    user: interaction.user?.id,
    department,
    email,
    priority,
  });

  await interaction.deferReply({ ephemeral: true });

  if (!email) {
    return interaction.editReply('❌ חובה לספק אימייל.');
  }

  const TIMEOUT_MS = 7000;
  let ticket;

  try {
    ticket = await Promise.race([
      openSupportTicket({
        departmentKey: department,
        subject,
        message,
        email,
        priority,
        discordUser: interaction.user,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ticket timeout')), TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.error('[/ticket] error or timeout:', err?.response?.data || err.message);

    return interaction.editReply(
      '❌ לא הצלחנו לפתוח טיקט במערכת. נסה שוב מאוחר יותר.'
    );
  }

  if (!ticket) {
    return interaction.editReply(
      '❌ לא התקבלה תשובה ממערכת הטיקטים. נסה שוב מאוחר יותר.'
    );
  }

  let linkText = '';
  if (ticket.tid && ticket.c) {
    linkText = `\n🔗 צפייה בטיקט: ${CLIENT_AREA_URL}/viewticket.php?tid=${ticket.tid}&c=${ticket.c}`;
  }

  const deptLabel = {
    gameservers: 'שרתים / Gameservers',
    billing: 'חיוב ותשלומים',
    abuse: 'Abuse / תלונות',
    general: 'תמיכה כללית',
  }[department] || 'תמיכה';

  await interaction.editReply(
    `✅ הטיקט שלך נפתח במחלקת **${deptLabel}**.\n` +
    `מספר טיקט: **${ticket.tid || ticket.ticketId}**${linkText}`
  );
}

// --------------------------------------------------------
//  HTTP SERVER (Fly.io requirement)
// --------------------------------------------------------
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Discord bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 HTTP server running on port ${PORT}`);
});

// --------------------------------------------------------
// הפעלת הבוט
// --------------------------------------------------------
client.login(process.env.TOKEN);
