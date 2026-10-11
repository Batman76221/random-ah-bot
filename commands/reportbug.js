const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reportbug')
    .setDescription('Report a bug'),

  async execute(interaction) {
    if (interaction.channelId !== config.bugReportChannelId) {
      return interaction.reply({ content: `Please use <#${config.bugReportChannelId}> to report bugs.`, ephemeral: true }).catch(() => {});
    }

    const modal = new ModalBuilder().setCustomId('bugReportModal').setTitle('Bug Report');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bug').setLabel('Bug Description').setStyle(TextInputStyle.Paragraph).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bugType').setLabel('Bug Type (major / small)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('proofLink').setLabel('Proof (image URL or links, space-separated)').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }
};
