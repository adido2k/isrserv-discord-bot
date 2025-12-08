const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// Load commands dynamically (if needed in future)

// When bot starts
client.once("ready", () => {
    console.log(`🚀 Bot is online as ${client.user.tag}`);
});

// Slash command handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "status") {
        return interaction.reply("🟢 השרת פעיל! (דוגמה)");
    }

    if (commandName === "renew") {
        return interaction.reply("🔄 חידוש מנוי נשלח! (דוגמה)");
    }

    if (commandName === "verify") {
        return interaction.reply("✅ אימות בוצע בהצלחה! (דוגמה)");
    }
});

client.login(process.env.TOKEN);
