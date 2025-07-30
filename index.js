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
  StringSelectMenuBuilder,
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
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const {
  DISCORD_TOKEN,
  STAFF_ROLE_ID,
  CATEGORY_ID,
  PANEL_CHANNEL_ID,
  LOG_CHANNEL_ID,
  AVALIACAO_CHANNEL_ID,
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
    .setThumbnail('https://i.imgur.com/yaztUeK.png') // imagem atualizada
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

// Função que cria o painel padrão de botões no ticket (fechar, resgatar, deletar, adicionar membro)
function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_resgatar').setLabel('Resgatar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_fechar').setLabel('Fechar').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_deletar').setLabel('Deletar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_adicionar_membro').setLabel('Adicionar Membro').setStyle(ButtonStyle.Primary)
  );
}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} online.`);
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
  await sendPanel(panelChannel);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Abrir ticket
    if (interaction.isButton()) {
      if (interaction.customId === 'confirmar_ticket') {
        // Criar ticket
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

        // Mensagem inicial no canal do ticket com painel padrão
        const embedTicket = new EmbedBuilder()
          .setTitle(`🚑 INEM - Ticket ${channelName}`)
          .setDescription(
            `📣 Ticket aberto por <@${interaction.user.id}>.\n` +
            `Aguarde atendimento por parte do <@&${STAFF_ROLE_ID}>.\n\n` +
            `Para prosseguir, escolha o assunto do seu ticket abaixo no menu.`
          )
          .setColor('#ffcc00')
          .setTimestamp();

        // Menu suspenso para escolha do assunto
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_assunto')
          .setPlaceholder('Escolha o assunto do seu ticket')
          .addOptions([
            {
              label: 'Recrutamento',
              description: 'Abrir um ticket para recrutamento',
              value: 'recrutamento',
              emoji: '📋',
            },
            {
              label: 'Dúvidas',
              description: 'Abrir um ticket para tirar dúvidas',
              value: 'duvidas',
              emoji: '❓',
            },
            {
              label: 'Denúncias',
              description: 'Abrir um ticket para fazer uma denúncia',
              value: 'denuncias',
              emoji: '🚨',
            },
          ]);

        await canal.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embedTicket],
          components: [new ActionRowBuilder().addComponents(selectMenu), ticketButtons()],
        });

        // Log (opcional)
        if (LOG_CHANNEL_ID) {
          const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            await logChannel.send(`📥 Ticket criado: ${canal} por <@${interaction.user.id}>`);
          }
        }

        await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
        return;
      }

      // Botões dentro do ticket
      if (interaction.customId === 'btn_resgatar') {
        // Só user ou staff podem resgatar
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && interaction.user.id !== interaction.channel.topic) {
          return interaction.reply({ content: '❌ Só o staff ou quem abriu o ticket pode resgatar.', ephemeral: true });
        }
        await interaction.channel.send(`📌 Ticket resgatado por: <@${interaction.user.id}>`);
        return interaction.reply({ content: '✅ Você resgatou o ticket.', ephemeral: true });
      }

      if (interaction.customId === 'btn_fechar') {
        // Só user ou staff podem fechar
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && interaction.user.id !== interaction.channel.topic) {
          return interaction.reply({ content: '❌ Só o staff ou quem abriu o ticket pode fechar.', ephemeral: true });
        }

        // Envia mensagem de avaliação
        const embedAval = new EmbedBuilder()
          .setTitle('Avalie o atendimento')
          .setDescription(
            'Por favor, avalie o atendimento recebido clicando numa das estrelas abaixo:'
          )
          .setColor('#00ff00');

        const estrelas = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('avaliacao_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('avaliacao_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('avaliacao_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('avaliacao_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('avaliacao_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({ embeds: [embedAval], components: [estrelas], ephemeral: true });
        return;
      }

      if (interaction.customId === 'btn_deletar') {
        // Só user ou staff podem deletar
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && interaction.user.id !== interaction.channel.topic) {
          return interaction.reply({ content: '❌ Só o staff ou quem abriu o ticket pode deletar.', ephemeral: true });
        }
        await interaction.reply({ content: '⏳ Deletando o canal em 5 segundos...', ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
        return;
      }

      if (interaction.customId === 'btn_adicionar_membro') {
        // Modal para inserir ID do usuário
        const modal = new ModalBuilder()
          .setCustomId('modal_add_user')
          .setTitle('Adicionar membro ao ticket');

        const input = new TextInputBuilder()
          .setCustomId('user_id')
          .setLabel('ID ou menção do usuário')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 123456789012345678')
          .setRequired(true);

        modal.addComponents(new ActionRow
