// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('מצב השרתים')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('renew')
    .setDescription('בדיקת חידוש מנוי / שרת')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('אימות לקוח לפי WHMCS')
    .addStringOption((option) =>
      option
        .setName('email')
        .setDescription('אימייל בחשבון WHMCS')
        .setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('פתיחת טיקט תמיכה ב-WHMCS')
    .addStringOption((option) =>
      option
        .setName('subject')
        .setDescription('נושא הטיקט')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('פירוט התקלה / הבקשה')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('department')
        .setDescription('לאיזה מחלקה לפתוח את הטיקט')
        .setRequired(false)
        .addChoices(
          { name: 'תמיכת שרתי משחק', value: 'gameservers' },
          { name: 'חיוב / תשלומים', value: 'billing' },
          { name: 'Abuse / שימוש לרעה', value: 'abuse' },
        ),
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    const app = await rest.get(Routes.oauth2CurrentApplication());

    await rest.put(Routes.applicationCommands(app.id), {
      body: commands,
    });

    console.log('✅ Slash commands registered successfully.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
