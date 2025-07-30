require('dotenv').config();
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const {
  DISCORD_TOKEN,
  STAFF_ROLE_ID,
  CATEGORY_ID,
  PANEL_CHANNEL_ID,
  LOG_CHANNEL_ID
} = process.env;

function getNextTicketNumber() {
  const data = JSON.parse(fs.readFileSync('contador.json'));
  const number = data.ticketNumber;
  data.ticketNumber++;
  fs.writeFileSync('contador.json', JSON.stringify(data));
  return number;
}

async function sendPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🆘 INEM | Sistema de Atendimento')
    .setDescription('Clique no botão abaixo para te ajudar-mos.\n\n⚠️ **Estamos abertos a 24h.**')
    .setImage('https://www.inem.pt/wp-content/uploads/2022/06/noticia-inem-inquerito-partes-interessadas-e1654738010474.jpg')
    .setColor('#1e90ff')
    .setFooter({ text: 'INEM Sucesso Roleplay - TomasPlayBR', iconURL: client.user.displayAvatarURL() });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirmar_ticket')
      .setLabel('📩 Pedir Ajuda')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} online.`);
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
  await sendPanel(panelChannel);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'confirmar_ticket') {
      const confirmMsg = await interaction.reply({
        content: `⚠️ <@${interaction.user.id}>, Tens a certeza que queres abrir um ticket no INEM?`,
        fetchReply: true,
        ephemeral: false
      });

      await confirmMsg.react('✅');
      await confirmMsg.react('❌');

      const filter = (reaction, user) =>
        ['✅', '❌'].includes(reaction.emoji.name) &&
        user.id === interaction.user.id;

      confirmMsg.awaitReactions({ filter, max: 1, time: 15000, errors: ['time'] })
        .then(async (collected) => {
          const reaction = collected.first();

          if (reaction.emoji.name === '✅') {
            const numero = getNextTicketNumber();
            const channelName = `ticket-${numero}`;

            const canal = await interaction.guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: CATEGORY_ID,
              permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
              ],
            });

            const embed = new EmbedBuilder()
              .setTitle('🚑 INEM - Ticket de Emergência')
              .setDescription(`📣 Ticket aberto por <@${interaction.user.id}>.\nAguarde atendimento por parte do <@&${1136777407982993418}>.`)
              .setThumbnail('https://www.inem.pt/wp-content/uploads/2021/12/inem-noticia-esclarecimento-testagem.jpg')
              .setColor('#ffcc00')
              .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('resgatar_ticket').setLabel('📥 Resgatar').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('adicionar_membro').setLabel('👤 Adicionar').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('fechar_ticket').setLabel('🔒 Fechar').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('deletar_ticket').setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger)
            );

            await canal.send({
              content: `<@&${STAFF_ROLE_ID}> | Ticket criado por <@${interaction.user.id}>`,
              embeds: [embed],
              components: [row]
            });

            if (LOG_CHANNEL_ID) {
              const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
              if (logChannel) {
                await logChannel.send(`📥 Ticket criado: ${canal} por <@${interaction.user.id}>`);
              }
            }
          } else {
            await interaction.followUp({ content: '❌ Cancelaste a criação do ticket.', ephemeral: true });
          }
        })
        .catch(() => {
          interaction.followUp({ content: '⏰ Tempo esgotado. Não foi criado nenhum ticket.', ephemeral: true });
        });
    }

    if (interaction.customId === 'resgatar_ticket') {
      await interaction.reply({ content: `📥 Ticket resgatado por <@${interaction.user.id}>.`, ephemeral: false });
    }

    if (interaction.customId === 'adicionar_membro') {
      const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Adicionar Membro ao Ticket');
      const input = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('ID do utilizador ou menção')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'fechar_ticket') {
      await interaction.reply({ content: '🔒 Ticket será fechado em 5 segundos...', ephemeral: true });
      setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }

    if (interaction.customId === 'deletar_ticket') {
      await interaction.reply({ content: '🗑️ Ticket deletado com sucesso.', ephemeral: true });
      await interaction.channel.delete().catch(() => null);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_add_user') {
    const userId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');
    try {
      const member = await interaction.guild.members.fetch(userId);
      await interaction.channel.permissionOverwrites.create(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply({ content: `✅ <@${member.id}> foi adicionado ao ticket.`, ephemeral: false });
    } catch {
      await interaction.reply({ content: '❌ Utilizador inválido.', ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
