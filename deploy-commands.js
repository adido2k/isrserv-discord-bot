// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const { TOKEN, GUILD_ID } = process.env;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing TOKEN or GUILD_ID env vars.');
  process.exit(1);
}

// 4 ה-Slash Commands: /status /renew /verify /ticket
const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('מציג סטטוס של שירות לפי service_id ב-WHMCS')
    .addStringOption((option) =>
      option
        .setName('service_id')
        .setDescription('ID של השירות ב-WHMCS')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('renew')
    .setDescription('קישור לחידוש מנוי לפי service_id')
    .addStringOption((option) =>
      option
        .setName('service_id')
        .setDescription('ID של השירות ב-WHMCS')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('אימות לקוח לפי אימייל והוספת רול')
    .addStringOption((option) =>
      option
        .setName('email')
        .setDescription('האימייל שבו הלקוח רשום ב-WHMCS')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('פותח טיקט תמיכה ב-WHMCS')
    .addStringOption((option) =>
      option
        .setName('department')
        .setDescription('מחלקה')
        .setRequired(true)
        .addChoices(
          { name: 'שרתים / Gameservers', value: 'gameservers' },
          { name: 'חיוב ותשלומים', value: 'billing' },
          { name: 'Abuse / תלונות', value: 'abuse' },
          { name: 'תמיכה כללית', value: 'general' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('subject')
        .setDescription('נושא קצר לטיקט')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('email')
        .setDescription('האימייל שלך ב-isrServ / WHMCS')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('תיאור הבעיה / הבקשה שלך')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('priority')
        .setDescription('עדיפות הטיקט')
        .setRequired(false)
        .addChoices(
          { name: 'Low', value: 'Low' },
          { name: 'Medium', value: 'Medium' },
          { name: 'High', value: 'High' },
        )
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');

    const app = await rest.get(Routes.oauth2CurrentApplication());

    await rest.put(Routes.applicationGuildCommands(app.id, GUILD_ID), {
      body: commands,
    });

    console.log('✅ Slash commands registered successfully.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
