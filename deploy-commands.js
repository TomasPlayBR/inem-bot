const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder().setName('deletar').setDescription('Deleta o ticket atual'),
  new SlashCommandBuilder().setName('fechar').setDescription('Fecha o ticket com avaliação'),
  new SlashCommandBuilder().setName('reclamar').setDescription('Abre um ticket de reclamação'),
  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adiciona um usuário ao ticket')
    .addUserOption(option => option.setName('usuario').setDescription('Usuário para adicionar').setRequired(true)),
]
  .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Iniciando o registro dos comandos slash...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos slash registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();
