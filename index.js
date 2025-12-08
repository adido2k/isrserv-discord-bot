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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const GUILD_ID = process.env.GUILD_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID; // רול שיקבל לקוח מאומת
const CLIENT_AREA_URL = process.env.CLIENT_AREA_URL;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --------------------------------------------------------
//             Slash Commands handler
// --------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'status') {
      await handleStatus(interaction);
    } else if (interaction.commandName === 'renew') {
      await handleRenew(interaction);
    } else if (interaction.commandName === 'verify') {
      await handleVerify(interaction);
    } else if (interaction.commandName === 'ticket') {
      await handleTicket(interaction);
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
// /status
// --------------------------------------------------------
async function handleStatus(interaction) {
  const serviceId = interaction.options.getString('service_id');

  await interaction.deferReply({ ephemeral: true });

  if (!serviceId) {
    await interaction.editReply('ℹ אנא ספק service_id של השירות שברצונך לבדוק.');
    return;
  }

  const status = await getServiceStatus(serviceId);
  if (!status) {
    await interaction.editReply('❌ לא נמצא שירות עם ה-ID שסיפקת.');
    return;
  }

  await interaction.editReply(
    `🖥 **סטטוס שירות #${status.id}**\n` +
      `שם: **${status.name}**\n` +
      `סטטוס: **${status.status}**\n` +
      `תאריך חידוש הבא: **${status.nextDueDate}**`
  );
}

// --------------------------------------------------------
// /renew
// --------------------------------------------------------
async function handleRenew(interaction) {
  const serviceId = interaction.options.getString('service_id');

  await interaction.deferReply({ ephemeral: true });

  if (!serviceId) {
    await interaction.editReply('ℹ אנא ספק service_id של השירות שברצונך לחדש.');
    return;
  }

  const link = await getRenewLinkByService(serviceId);

  await interaction.editReply(
    `🔁 לינק לחידוש מנוי עבור שירות #${serviceId}:\n${link}`
  );
}

// --------------------------------------------------------
// /verify
// --------------------------------------------------------
async function handleVerify(interaction) {
  const email = interaction.options.getString('email');

  await interaction.deferReply({ ephemeral: true });

  const verifyResult = await verifyClientByEmail(email);

  if (!verifyResult || !verifyResult.activeServices.length) {
    await interaction.editReply('❌ לא נמצאו שירותים פעילים עבור המייל הזה.');
    return;
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
    `✅ נמצא לקוח עם ID ${verifyResult.clientId} ויש לו ${verifyResult.activeServices.length} שירותים פעילים.\n` +
      `הרול המתאים נוסף לך (אם היה מוגדר).`
  );
}

// --------------------------------------------------------
// /ticket  (תמיכה ל־WHMCS)
// --------------------------------------------------------
async function handleTicket(interaction) {
  const department = interaction.options.getString('department'); // gameservers / billing / abuse / general
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
    await interaction.editReply('❌ חובה לציין אימייל כדי שנוכל לחזור אליך.');
    return;
  }

  // נוודא שהבוט לא נתקע – timeout פנימי
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

    await interaction.editReply(
      '❌ לא הצלחנו לפתוח טיקט במערכת WHMCS כרגע. ' +
        'אפשר לנסות שוב עוד כמה רגעים או לפתוח טיקט ישירות דרך האתר.'
    );
    return;
  }

  if (!ticket) {
    await interaction.editReply(
      '❌ לא התקבלה תשובה ממערכת הטיקטים. נסה שוב מאוחר יותר.'
    );
    return;
  }

  let linkText = '';
  if (ticket.tid && ticket.c) {
    linkText = `\n🔗 צפייה בטיקט: ${CLIENT_AREA_URL}/viewticket.php?tid=${ticket.tid}&c=${ticket.c}`;
  } else if (CLIENT_AREA_URL) {
    linkText = `\n🔗 כל הטיקטים שלך: ${CLIENT_AREA_URL}/supporttickets.php`;
  }

  const deptLabel = {
    gameservers: 'שרתים / Gameservers',
    billing: 'חיוב ותשלומים',
    abuse: 'Abuse / תלונות',
    general: 'תמיכה כללית',
  }[department] || 'תמיכה';

  await interaction.editReply(
    `✅ הטיקט שלך נפתח בהצלחה במחלקת **${deptLabel}**.\n` +
      `מספר טיקט: **${ticket.tid || ticket.ticketId || 'לא ידוע'}**${linkText}`
  );
}

client.login(process.env.TOKEN);
