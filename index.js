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

// Função para obter próximo número de ticket formatado
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
    if (interaction.isButton()) {
      if (interaction.customId === 'confirmar_ticket') {
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

        // Botões de controle
        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('resgatar_ticket').setLabel('🎟️ Resgatar').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('fechar_ticket').setLabel('🔒 Fechar').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('deletar_ticket').setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('adicionar_usuario').setLabel('➕ Adicionar membro').setStyle(ButtonStyle.Success)
        );

        // Menu de assunto
        const selectAssunto = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_assunto')
            .setPlaceholder('Escolha o assunto do seu ticket')
            .addOptions([
              { label: 'Recrutamento', description: 'Abrir um ticket para recrutamento', value: 'recrutamento' },
              { label: 'Dúvidas', description: 'Abrir um ticket para tirar dúvidas', value: 'duvidas' },
              { label: 'Denúncias', description: 'Abrir um ticket para fazer uma denúncia', value: 'denuncias' },
            ])
        );

        // Mensagem principal com botões
        await canal.send({
          content: `<@&${STAFF_ROLE_ID}> | Ticket criado por <@${interaction.user.id}>`,
          embeds: [embed],
          components: [botoes],
        });

        // Mensagem secundária com escolha de assunto
        await canal.send({
          content: `📝 Para prosseguir escolha um dos assuntos que se associa ao que você quer.`,
          components: [selectAssunto],
        });

        if (LOG_CHANNEL_ID) {
          const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            await logChannel.send(`📥 Ticket criado: ${canal} por <@${interaction.user.id}>`);
          }
        }

        await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
      }

      // Botões administrativos
      if (interaction.customId === 'adicionar_usuario') {
        const modal = new ModalBuilder()
          .setCustomId('modal_add_user')
          .setTitle('Adicionar membro ao ticket')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel('ID ou menção do usuário')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
      }

      // Aqui você pode implementar resgatar, fechar, deletar se quiser
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_assunto') {
        const escolha = interaction.values[0];
        let resposta;

        if (escolha === 'recrutamento') {
          resposta = `Olá <@${interaction.user.id}>, por favor preenche isto:\n\n` +
            `Nome:\nId:\nIdade:\nJá esteve no INEM antes?\nPorque queres entrar no INEM?`;
        } else if (escolha === 'duvidas') {
          resposta = `Olá <@${interaction.user.id}>, qual é a tua dúvida?`;
        } else if (escolha === 'denuncias') {
          resposta = `Olá <@${interaction.user.id}>, quem queres denunciar?`;
        }

        await interaction.update({ content: resposta, components: [] });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_add_user') {
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
    }
  } catch (error) {
    console.error('Erro no interactionCreate:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Ocorreu um erro ao processar sua ação.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua ação.', ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
