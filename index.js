// index.js
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');

const {
  getServiceStatus,
  getRenewLinkByService,
  verifyClientByEmail
} = require('./whmcs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const GUILD_ID = process.env.GUILD_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID; // רול שיקבל לקוח מאומת

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// טיפול ב-Slash Commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'status') {
      await handleStatus(interaction);
    }

    if (interaction.commandName === 'renew') {
      await handleRenew(interaction);
    }

    if (interaction.commandName === 'verify') {
      await handleVerify(interaction);
    }
  } catch (err) {
    console.error('Command error:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ אירעה שגיאה בעת ביצוע הפקודה.', ephemeral: true });
    } else {
      await interaction.followUp({ content: '❌ אירעה שגיאה בעת ביצוע הפקודה.', ephemeral: true });
    }
  }
});

// /status
async function handleStatus(interaction) {
  const serviceId = interaction.options.getString('service_id');

  await interaction.deferReply({ ephemeral: true });

  if (!serviceId) {
    await interaction.editReply('ℹ אנא ספק service_id של השרת שברצונך לבדוק.');
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

// /renew
async function handleRenew(interaction) {
  const serviceId = interaction.options.getString('service_id');
  await interaction.deferReply({ ephemeral: true });

  const link = await getRenewLinkByService(serviceId);
  await interaction.editReply(
    `🔁 לינק לחידוש מנוי עבור שירות #${serviceId}:\n${link}`
  );
}

// /verify
async function handleVerify(interaction) {
  const email = interaction.options.getString('email');
  await interaction.deferReply({ ephemeral: true });

  const verifyResult = await verifyClientByEmail(email);

  if (!verifyResult.activeServices.length) {
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

client.login(process.env.TOKEN);
