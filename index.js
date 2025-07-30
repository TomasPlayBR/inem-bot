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
  return number.toString().padStart(2, '0');
}

async function sendPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('INEM | Sistema de Atendimento')
    .setDescription(
      'Olá! Clique no botão abaixo para abrir um ticket e receber ajuda do INEM.\n\n' +
      '⚠️ **Funcionamos 24 horas por dia, todos os dias da semana.**\n' +
      'Após abrir o ticket, aguarde que um membro da nossa equipe te atenda o mais rápido possível.'
    )
    .setColor('#1e90ff')
    .setThumbnail('https://i.imgur.com/pUiboY4.png')
    .setImage('https://i.imgur.com/pUiboY4.png')
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
  try {
    // Abrir ticket
    if (interaction.isButton() && interaction.customId === 'confirmar_ticket') {
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
        .setTitle('🚑 INEM - Sistema de Ticket')
        .setDescription(
          `📣 Ticket aberto por <@${interaction.user.id}>.\n` +
          `Aguarde atendimento por parte do <@&${STAFF_ROLE_ID}>.`
        )
        .setColor('#ffcc00')
        .setTimestamp();

      const assuntoRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('assunto_recrutamento').setLabel('Recrutamento').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('assunto_duvidas').setLabel('Dúvidas').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('assunto_denuncias').setLabel('Denúncias').setStyle(ButtonStyle.Danger),
      );

      const painelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('resgatar_ticket').setLabel('🎟️ Resgatar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('🔒 Fechar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('deletar_ticket').setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('adicionar_membro').setLabel('➕ Adicionar membro').setStyle(ButtonStyle.Success),
      );

      await canal.send({
        content: `<@&${STAFF_ROLE_ID}> | Ticket criado por <@${interaction.user.id}>`,
        embeds: [embed],
        components: [painelRow],
      });

      await canal.send({
        content: `📝 Para prosseguir escolha um dos assuntos que se associa ao que você quer.`,
        components: [assuntoRow],
      });

      if (LOG_CHANNEL_ID) {
        const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logChannel) {
          await logChannel.send(`📥 Ticket criado: ${canal} por <@${interaction.user.id}>`);
        }
      }

      await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
      return;
    }

    // Botões de assunto
    if (['assunto_recrutamento', 'assunto_duvidas', 'assunto_denuncias'].includes(interaction.customId)) {
      const channel = interaction.channel;
      const permission = channel.permissionOverwrites.cache.get(interaction.user.id);
      if (!permission || !permission.allow.has(PermissionsBitField.Flags.ViewChannel)) {
        return interaction.reply({ content: '❌ Só quem abriu o ticket pode escolher o assunto.', ephemeral: true });
      }

      let replyMessage = '';
      if (interaction.customId === 'assunto_recrutamento') {
        replyMessage = `Olá <@${interaction.user.id}>, por favor preenche isto:\n\nNome:\nId:\nIdade:\nJá esteve no INEM antes?\nPorque queres entrar no INEM?`;
      } else if (interaction.customId === 'assunto_duvidas') {
        replyMessage = `Olá <@${interaction.user.id}>, qual é a tua dúvida?`;
      } else if (interaction.customId === 'assunto_denuncias') {
        replyMessage = `Olá <@${interaction.user.id}>, quem queres denunciar?`;
      }

      await interaction.update({ content: interaction.message.content, components: [] });
      await channel.send(replyMessage);
      return;
    }

    // Painel: Fechar ticket
    if (interaction.customId === 'fechar_ticket') {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
      await interaction.reply({ content: '🔒 Ticket fechado.', ephemeral: true });
    }

    // Painel: Resgatar ticket
    if (interaction.customId === 'resgatar_ticket') {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
      await interaction.reply({ content: '🎟️ Ticket reaberto.', ephemeral: true });
    }

    // Painel: Deletar ticket
    if (interaction.customId === 'deletar_ticket') {
      await interaction.reply({ content: '🗑️ Ticket será deletado em 5 segundos.', ephemeral: true });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }

    // Painel: Adicionar membro (modal)
    if (interaction.customId === 'adicionar_membro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_user')
        .setTitle('Adicionar Membro');

      const input = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('ID do usuário')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }

    // Modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_add_user') {
      const userId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');
      try {
        const member = await interaction.guild.members.fetch(userId);
        await interaction.channel.permissionOverwrites.create(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        await interaction.reply({ content: `✅ <@${member.id}> foi adicionado ao ticket.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: '❌ Utilizador inválido.', ephemeral: true });
      }
    }

  } catch (error) {
    console.error('Erro:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Erro ao processar sua ação.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Erro ao processar sua ação.', ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
