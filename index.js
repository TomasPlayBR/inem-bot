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

// Configurações
const TICKET_CATEGORY_ID = '1225264234624188426';
const PANEL_CHANNEL_ID = '1225266760081735701';
const STAFF_ROLE_ID = '1136777407982993418';
let ticketCounter = 1;

// Envia painel
async function sendTicketPanel() {
  const canal = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!canal) return console.log('❌ Canal do painel não encontrado.');

  const embed = new EmbedBuilder()
    .setTitle('📩 Sistema de Tickets INEM')
    .setDescription('Clique no botão abaixo para criar um ticket com a nossa equipe de suporte.\n\n🧑‍⚕️ Equipe disponível 24/7.')
    .setColor('#00b0f4')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3208/3208710.png')
    .setFooter({ text: 'INEM - Atendimento rápido e eficaz', iconURL: client.user.displayAvatarURL() });

  const botao = new ButtonBuilder()
    .setCustomId('abrir_ticket')
    .setLabel('Abrir Ticket')
    .setEmoji('📩')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(botao);

  await canal.send({ embeds: [embed], components: [row] });
}

client.once('ready', async () => {
  console.log(`${client.user.tag} está online!`);
  // await sendTicketPanel(); ← descomenta se quiser que o painel envie sempre
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
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Ticket Criado')
      .setDescription(`Olá <@${interaction.user.id}>!\nA equipe já foi notificada. Aguarde atendimento.`)
      .setColor('#00ffae')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/2910/2910791.png')
      .setFooter({ text: 'INEM Suporte' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('resgatar_ticket')
        .setLabel('📥 Resgatar')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('adicionar_membro')
        .setLabel('➕ Adicionar')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('fechar_ticket')
        .setLabel('🔒 Fechar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('deletar_ticket')
        .setLabel('🗑️ Deletar')
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

    await interaction.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
  }

  // 📥 Resgatar Ticket
  if (interaction.customId === 'resgatar_ticket') {
    const embed = new EmbedBuilder()
      .setDescription(`🎫 Ticket resgatado por <@${interaction.user.id}>.`)
      .setColor('#ffd700');
    await interaction.reply({ embeds: [embed] });
  }

  // ➕ Adicionar membro
  if (interaction.customId === 'adicionar_membro') {
    await interaction.reply({ content: '✏️ Menciona o utilizador a adicionar com `@` (ex: @nome).', ephemeral: true });
    // Aqui, se quiseres, podemos capturar a próxima mensagem do usuário e adicionar essa pessoa. Quer que eu implemente isso?
  }

  // 🔒 Fechar Ticket
  if (interaction.customId === 'fechar_ticket') {
    const embed = new EmbedBuilder()
      .setDescription('🔒 Ticket será fechado em 5 segundos...')
      .setColor('#ff6961');
    await interaction.reply({ embeds: [embed] });
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
  }

  // 🗑️ Deletar Ticket
  if (interaction.customId === 'deletar_ticket') {
    await interaction.reply({ content: '🗑️ Ticket deletado permanentemente.', ephemeral: true });
    await interaction.channel.delete().catch(console.error);
  }
});

client.login(process.env.DISCORD_TOKEN);
