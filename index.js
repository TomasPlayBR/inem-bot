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

// Função para obter próximo número de ticket formatado (ex: 01, 02, 10)
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
    .setThumbnail('https://i.imgur.com/yaztUeK.png') // Exemplo de thumbnail
    .setImage('https://i.imgur.com/yaztUeK.png') // Exemplo de imagem
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
      // Criar ticket direto (sem confirmação extra)
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

      // Botões para escolha do assunto do ticket - só para o user que abriu
      const assuntoRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('assunto_recrutamento').setLabel('Recrutamento').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('assunto_duvidas').setLabel('Dúvidas').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('assunto_denuncias').setLabel('Denúncias').setStyle(ButtonStyle.Danger),
      );

      await canal.send({
        content: `<@&${STAFF_ROLE_ID}> | Ticket criado por <@${interaction.user.id}>`,
        embeds: [embed],
        components: [assuntoRow]
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

    // Assunto do ticket - só o user que abriu pode clicar
    if (['assunto_recrutamento', 'assunto_duvidas', 'assunto_denuncias'].includes(interaction.customId)) {
      // Verifica se o user que clicou é o dono do canal (ticket)
      const channel = interaction.channel;
      const permission = channel.permissionOverwrites.cache.get(interaction.user.id);
      if (!permission || !permission.allow.has(PermissionsBitField.Flags.ViewChannel)) {
        return interaction.reply({ content: '❌ Só quem abriu o ticket pode escolher o assunto.', ephemeral: true });
      }

      let replyMessage = '';

      if (interaction.customId === 'assunto_recrutamento') {
        replyMessage = `Olá <@${interaction.user.id}>, por favor preenche isto:\n\n` +
          `Nome:\nId:\nIdade:\nJá esteve no INEM antes?\nPorque queres entrar no INEM?`;
      } else if (interaction.customId === 'assunto_duvidas') {
        replyMessage = `Olá <@${interaction.user.id}>, qual é a tua dúvida?`;
      } else if (interaction.customId === 'assunto_denuncias') {
        replyMessage = `Olá <@${interaction.user.id}>, quem queres denunciar?`;
      }

      // Remove os botões após escolha
      await interaction.update({ content: interaction.message.content, embeds: interaction.message.embeds, components: [] });
      await channel.send(replyMessage);
      return;
    }

    // Aqui pode ficar outras ações de botões como fechar, deletar, adicionar membro etc, se quiser
  }
});

client.login(DISCORD_TOKEN);
