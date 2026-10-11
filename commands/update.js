const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Post a game update'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.developerRoleId)) {
      return interaction.reply({ content: 'Only developers can post updates.', ephemeral: true });
    }

    const modal = new ModalBuilder().setCustomId('updateModal').setTitle('Post Game Update');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('version').setLabel('Version (e.g. v1.2.0)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('added').setLabel('Added (one per line)').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('New map\nDouble XP event')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('removed').setLabel('Removed (one per line)').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Old lobby\nBroken tool')
      )
    );

    await interaction.showModal(modal);
  }
};
