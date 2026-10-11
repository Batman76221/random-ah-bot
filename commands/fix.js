const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fix')
    .setDescription('Mark a bug as fixed')
    .addIntegerOption(opt => opt.setName('bugid').setDescription('Bug ID').setRequired(true)),

  async execute(interaction, bugs, saveIdData) {
    if (!interaction.member.roles.cache.has(config.developerRoleId)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const bugId = interaction.options.getInteger('bugid').toString();
    if (!bugs.get(bugId)) {
      return interaction.reply({ content: `Bug #${bugId} not found.`, ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`bugMsg_fixed_${bugId}`)
      .setTitle(`Fix Bug #${bugId}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('devMessage')
          .setLabel('Message to send the reporter')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('e.g. Fixed in the latest update!')
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }
};
