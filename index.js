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
  InteractionType
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
  EVAL_LOG_CHANNEL_ID
} = process.env;

// Função para obter próximo número de ticket formatado
function getNextTicketNumber() {
  const data = JSON.parse(fs.readFileSync('contador.json', 'utf-8'));
  const number = data.ticketNumber;
  data.ticketNumber++;
  fs.writeFileSync('contador.json', JSON.stringify(data, null, 2));
  return number.toString().padStart(2, '0');
}

// Enviar painel inicial com botão de abrir ticket
async function sendPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('INEM | Sistema de Atendimento')
    .setDescription(
      'Olá! Clique no botão abaixo para abrir um ticket e receber ajuda do INEM.\n\n' +
      '⚠️ **Funcionamos 24 horas por dia, todos os dias da semana.**\n' +
      'Após abrir o ticket, aguarde que um membro da nossa equipe te atenda o mais rápido possível.'
    )
    .setColor('#1e90ff')
    .setThumbnail('https://i.imgur.com/yaztUeK.png')
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
    // ---------------------------
    // BOTÕES
    // ---------------------------
    if (interaction.isButton()) {
      if (interaction.customId === 'confirmar_ticket') {
        // Criar ticket normal
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

        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🚑 Ticket #${numero} - INEM`)
          .setDescription(`Olá, <@&${STAFF_ROLE_ID}>, um novo ticket foi aberto por <@${interaction.user.id}>, aguarde atendimento.\n\nPara prosseguir, escolha um dos assuntos abaixo.`)
          .setColor('#ffcc00')
          .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_fechar').setLabel('🔒 Fechar Ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_resgatar').setLabel('🛠️ Resgatar Ticket').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('btn_deletar').setLabel('❌ Deletar Ticket').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_adicionar_membro').setLabel('➕ Adicionar Membro').setStyle(ButtonStyle.Success)
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_assunto')
          .setPlaceholder('Escolha o assunto do seu ticket')
          .addOptions([
            { label: 'Recrutamento', description: 'Abrir um ticket para recrutamento', value: 'recrutamento' },
            { label: 'Dúvidas', description: 'Abrir um ticket para tirar dúvidas', value: 'duvidas' },
            { label: 'Denúncias', description: 'Abrir um ticket para fazer uma denúncia', value: 'denuncias' },
          ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await canal.send({ content: `<@${interaction.user.id}>`, embeds: [ticketEmbed], components: [buttons] });
        await canal.send({ content: 'Para prosseguir, escolha um dos assuntos que se associa ao que você quer:', components: [selectRow] });

        if (LOG_CHANNEL_ID) {
          const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            await logChannel.send(`📥 Ticket criado: ${canal} por <@${interaction.user.id}>`);
          }
        }

        await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
        return;
      }

      if (interaction.customId === 'btn_fechar') {
        const modal = new ModalBuilder()
          .setCustomId('modal_avaliacao')
          .setTitle('Avaliação do Atendimento');

        const input = new TextInputBuilder()
          .setCustomId('avaliacao')
          .setLabel('Avalie o atendimento (1-5 estrelas)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Sua avaliação aqui...')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === 'btn_resgatar') {
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await interaction.reply({ content: `✅ Ticket resgatado por <@${interaction.user.id}>.`, ephemeral: false });
        return;
      }

      if (interaction.customId === 'btn_deletar') {
        await interaction.reply({ content: '🗑️ O ticket será deletado em 5 segundos...', ephemeral: true });
        setTimeout(() => {
          interaction.channel.delete().catch(() => { });
        }, 5000);
        return;
      }

      if (interaction.customId === 'btn_adicionar_membro') {
        const modal = new ModalBuilder()
          .setCustomId('modal_add_user')
          .setTitle('Adicionar membro ao ticket');

        const input = new TextInputBuilder()
          .setCustomId('user_id')
          .setLabel('ID ou menção do usuário')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 123456789012345678')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
        return;
      }
    }

    // ---------------------------
    // SELECT MENU
    // ---------------------------
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_assunto') {
        const escolha = interaction.values[0];
        let resposta;

        if (escolha === 'recrutamento') {
          resposta = `Olá <@${interaction.user.id}>, por favor preencha:\n\n` +
            `Nome:\nId:\nIdade:\nJá esteve no INEM antes?\nPorque queres entrar no INEM?`;
        } else if (escolha === 'duvidas') {
