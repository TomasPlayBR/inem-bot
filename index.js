require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const TICKET_CATEGORY_ID = '1225264234624188426'; // Coloca a categoria onde os tickets vão ser criados
const PANEL_CHANNEL_ID = '1225266760081735701'; // Canal onde vai o painel

// Função para criar painel de tickets com embed + botão
async function sendTicketPanel() {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!channel) return console.log('Canal do painel não encontrado!');

  const embed = new EmbedBuilder()
    .setTitle('🎫 Painel de Tickets')
    .setDescription('Clique no botão abaixo para abrir um ticket. Um membro da equipe irá responder em breve!')
    .setColor('#0099ff')
    .setThumbnail('https://i.imgur.com/O3DHIA5.png') // Exemplo de imagem para o painel
    .setFooter({ text: 'Sistema de Tickets INEM' });

  const button = new ButtonBuilder()
    .setCustomId('open_ticket')
    .setLabel('Abrir Ticket')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🎟️');

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({ embeds: [embed], components: [row] });
}

client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} está online!`);
  // Enviar o painel quando o bot iniciar (comenta após a 1ª execução para não spam)
  // await sendTicketPanel();
});

// Contador para nome dos tickets (podes usar um banco de dados pra guardar de forma persistente)
let ticketCount = 1;

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Abrir ticket
  if (interaction.customId === 'open_ticket') {
    // Verifica se usuário já tem ticket aberto (opcional)
    const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
    if (existing) {
      return interaction.reply({ content: 'Você já tem um ticket aberto!', ephemeral: true });
    }

    // Criar canal na categoria especificada
    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticketCount.toString().padStart(2, '0')}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
        },
        // Coloca aqui o ID do cargo da equipe que pode ver o ticket
        {
          id: '1136777407982993418',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
        },
      ],
    });

    ticketCount++;

    const embed = new EmbedBuilder()
      .setTitle(`Ticket de ${interaction.user.tag}`)
      .setDescription('Obrigado por abrir o ticket! Um membro da equipe irá te ajudar em breve.')
      .setColor('#00ff00');

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

    await interaction.reply({ content: `Seu ticket foi criado: ${channel}`, ephemeral: true });
  }

  // Fechar ticket
  if (interaction.customId === 'close_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: 'Este comando só funciona dentro de canais de tickets.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Ticket será fechado em 10 segundos...')
      .setColor('#ff0000');

    await interaction.reply({ embeds: [embed] });

    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 10000);
  }
});

client.login(process.env.DISCORD_TOKEN);
