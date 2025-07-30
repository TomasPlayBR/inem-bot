require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  InteractionType,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

// IDs personalizados
const TICKET_CATEGORY_ID = '1225264234624188426'; // ← tua categoria
const PANEL_CHANNEL_ID = '1225266760081735701';   // ← onde o painel será enviado
const STAFF_ROLE_ID = '1136777407982993418';      // ← quem pode ver os tickets

// Painel com botão para abrir ticket
async function sendTicketPanel() {
  const canal = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!canal) return console.log('❌ Canal do painel não encontrado.');

  const embed = new EmbedBuilder()
    .setTitle('🎫 Sistema de Tickets')
    .setDescription('Clique no botão abaixo para abrir um ticket.\nNossa equipe irá ajudá-lo o mais rápido possível.')
    .setColor('#00b0f4')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3208/3208710.png')
    .setFooter({ text: 'INEM - Suporte Rápido', iconURL: client.user.displayAvatarURL() });

  const botao = new ButtonBuilder()
    .setCustomId('abrir_ticket')
    .setLabel('Abrir Ticket')
    .setEmoji('📩')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botao);

  await canal.send({ embeds: [embed], components: [row] });
}

// Contador de ticket local (para uso simples)
let ticketCounter = 1;

client.once('ready', async () => {
  console.log(`${client.user.tag} está online!`);
  await sendTicketPanel(); // Só precisa rodar uma vez para criar o painel
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.type !== InteractionType.MessageComponent) return;

  // 📩 Criar Ticket
  if (interaction.customId === 'abrir_ticket') {
    const numero = ticketCounter.toString().padStart(2, '0');
    ticketCounter++;

    const canal = await interaction.guild.channels.create({
      name: `ticket-${numero}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket Aberto`)
      .setDescription(`Olá <@${interaction.user.id}>, obrigado por abrir um ticket.\nAguarde atendimento da equipe.`)
      .setColor('#00ffae')
      .setTimestamp();

    const botaoFechar = new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(botaoFechar);

    await canal.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
  }

  // 🔒 Fechar Ticket
  if (interaction.customId === 'fechar_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ Isto só pode ser usado dentro de um ticket.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🕒 Fechando Ticket...')
      .setDescription('Este canal será fechado em 5 segundos.')
      .setColor('#ff6961');

    await interaction.reply({ embeds: [embed] });

    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);
