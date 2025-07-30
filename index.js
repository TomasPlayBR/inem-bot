require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} está online!`);

  // ID do canal onde queres enviar a mensagem
  const channelId = '1225266760081735701';

  // Buscar o canal pelo ID
  const channel = await client.channels.fetch(channelId).catch(console.error);
  
  if (!channel) {
    console.log('Canal não encontrado!');
    return;
  }

  // Mensagem do painel
  const painelMessage = `
  🎫 **Painel de Tickets** 🎫

  Para abrir um ticket, reaja com 🎟️ nesta mensagem!
  `;

  // Enviar a mensagem
  channel.send(painelMessage).catch(console.error);
});

client.login(process.env.DISCORD_TOKEN);
