const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const STAFF_ROLE_ID = '';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('star')
    .setDescription('star player'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Star')
      .setColor('#ffffff')
      .setDescription(
        '**Roblox Username:**\n\n' +
        '**Roblox ID:**\n\n' +
        '**Clips:**\n'
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
