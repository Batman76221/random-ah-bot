const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const STAFF_ROLE_ID = '';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crew')
    .setDescription('Submit a crew application'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Crew Application')
      .setColor('#ffffff')
      .setDescription(
        '**Group ID:**\n' +
        '**Crew Name:**\n\n' +
        '**Solid Colour:**\n\n' +
        '*or*\n\n' +
        '**Gradient Colour:**\n\n' +
        '> You must have **5+ members** in both the group and the Discord server.'
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
