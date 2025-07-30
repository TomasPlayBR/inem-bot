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
  LOG_CHANNEL_ID
} = process.env;

// Função para obter próximo número de ticket formatado
function getNextTicketNumber() {
  const data = JSON.parse(fs.readFileSync('contador.json'));
  const number = data.ticketNumber;
  data.ticketNumber++;
  fs.writeFileSync('contador.json', JSON.stringify(data, null, 2));
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
    .setThumbnail('https://i.imgur.com/yaztUeK.png') // Imagem que você mandou
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
    // Botão abrir ticket
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

        // Envia mensagem inicial com painel de ações (fechar, resgatar, deletar, adicionar membro)
        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🚑 Ticket #${numero} - INEM`)
          .setDescription(`Olá <@${interaction.user.id}>, aguarde atendimento.\n\nPara prosseguir, escolha um dos assuntos abaixo.`)
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

      // Painel de botões dentro do ticket
      if (interaction.customId === 'btn_fechar') {
        // Modal para avaliação ao fechar
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
        // Resgatar o ticket: coloca quem resgatou na permissão e envia mensagem
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

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
        return;
      }
    }

    // Select menu do assunto
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_assunto') {
        const escolha = interaction.values[0];
        let resposta;

        if (escolha === 'recrutamento') {
          resposta = `Olá <@${interaction.user.id}>, por favor preencha:\n\n` +
            `Nome:\nId:\nIdade:\nJá esteve no INEM antes?\nPorque queres entrar no INEM?`;
        } else if (escolha === 'duvidas') {
          resposta = `Qual a tua dúvida? Por favor, escreve-a aqui para que possamos ajudar.`;
        } else if (escolha === 'denuncias') {
          resposta = `Quem queres denunciar? Por favor, diz-nos o nome ou ID da pessoa.`;
        } else {
          resposta = `Assunto inválido.`;
        }

        await interaction.update({ content: resposta, components: [] });
        return;
      }
    }

    // Modal submits
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId === 'modal_add_user') {
        const userIdRaw = interaction.fields.getTextInputValue('user_id');
        const userId = userIdRaw.replace(/[<@!>]/g, ''); // Limpa menções

        try {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!member) {
            return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
          }

          await interaction.channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });

          await interaction.reply({ content: `✅ ${member} adicionado ao ticket com sucesso!`, ephemeral: true });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: '❌ Erro ao adicionar usuário.', ephemeral: true });
        }
        return;
      }

      if (interaction.customId === 'modal_avaliacao') {
        const avaliacao = interaction.fields.getTextInputValue('avaliacao');
        const ticketNumberMatch = interaction.channel.name.match(/\d+/);
        const ticketNumber = ticketNumberMatch ? ticketNumberMatch[0] : '??';

        // Log da avaliação no canal de logs
        if (LOG_CHANNEL_ID) {
          const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle('📝 Nova Avaliação de Ticket')
              .addFields(
                { name: 'Usuário', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Ticket', value: `#${ticketNumber}`, inline: true },
                { name: 'Avaliação', value: avaliacao }
              )
              .setColor('#00ff00')
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }
        }

        await interaction.reply({ content: 'Obrigado pela sua avaliação! O ticket será fechado agora.', ephemeral: true });
        // Fecha o ticket após avaliação (deleta canal)
        setTimeout(() => {
          interaction.channel.delete().catch(() => { });
        }, 3000);
        return;
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
