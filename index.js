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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

// ⚙️ Configurações
const TICKET_CATEGORY_ID = '1225264234624188426';
const PANEL_CHANNEL_ID = '1225266760081735701';
const STAFF_ROLE_ID = '1136777407982993418';
let ticketCounter = 1;

// 🟨 Enviar painel
async function sendTicketPanel() {
  const canal = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!canal) return console.log('❌ Canal do painel não encontrado.');

  const embed = new EmbedBuilder()
    .setTitle('🚑 Abrir Ticket - INEM')
    .setDescription('Clique no botão abaixo para contactar o INEM em RP.\n\n🔹 Apenas utilize em situações justificadas.\n🔹 Aguarde atendimento por um profissional.')
    .setColor('#007bff')
    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/INEM_ambulance_-_panoramio.jpg/320px-INEM_ambulance_-_panoramio.jpg')
    .setFooter({ text: 'INEM - Emergência Médica', iconURL: client.user.displayAvatarURL() });

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
  // await sendTicketPanel(); // descomenta se quiser que envie o painel ao iniciar
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    // 📩 Criar ticket
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
        .setTitle('🎟️ Ticket Aberto')
        .setDescription(`Olá <@${interaction.user.id}>!\nA equipa do INEM foi notificada. Responderemos brevemente.`)
        .setColor('#00ffae')
        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/8/8d/INEM_logo.png')
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

    // 📥 Resgatar ticket
    if (interaction.customId === 'resgatar_ticket') {
      const embed = new EmbedBuilder()
        .setDescription(`🎫 Ticket resgatado por <@${interaction.user.id}>.`)
        .setColor('#ffd700');
      await interaction.reply({ embeds: [embed] });
    }

    // ➕ Abrir modal para adicionar alguém
    if (interaction.customId === 'adicionar_membro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_member')
        .setTitle('➕ Adicionar ao Ticket');

      const input = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('ID do utilizador ou menção')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1234567890 ou @nome')
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // 🔒 Fechar ticket
    if (interaction.customId === 'fechar_ticket') {
      const embed = new EmbedBuilder()
        .setDescription('🔒 Este ticket será fechado em 5 segundos...')
        .setColor('#ff6961');
      await interaction.reply({ embeds: [embed] });
      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 5000);
    }

    // 🗑️ Deletar ticket
    if (interaction.customId === 'deletar_ticket') {
      await interaction.reply({ content: '🗑️ Ticket deletado.', ephemeral: true });
      await interaction.channel.delete().catch(console.error);
    }
  }

  // 📩 Submissão do modal
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_add_member') {
    const userInput = interaction.fields.getTextInputValue('user_id');
    const userId = userInput.replace(/[<@!>]/g, '');

    try {
      const member = await interaction.guild.members.fetch(userId);
      await interaction.channel.permissionOverwrites.create(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await interaction.reply({ content: `✅ <@${member.id}> adicionado ao ticket.`, ephemeral: false });
    } catch (err) {
      await interaction.reply({ content: '❌ Não consegui adicionar este membro. Verifica o ID ou se ele está no servidor.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
