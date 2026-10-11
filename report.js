const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Submit a player report'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Player Report')
      .setColor('#ffffff')
      .setDescription(
        '**Username:**\n\n' +
        '**ID:**\n\n' +
        '**Proof:**\n'
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
