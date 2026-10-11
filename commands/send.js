const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send the ZeHood reaction roles embed'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('ZeHood Reaction Roles')
      .setColor(0xFFFFFF)
      .setDescription(
        '**Chat Revive** — Get pinged when chat needs reviving\n' +
        '**Voice Chat Revive** — Get pinged when VC needs reviving\n' +
        '**Known Polls** — Get notified for polls\n' +
        '**Game Polls** — Get notified for game polls\n\n' +
        'React below to get or remove a role!'
      );

    const channel = interaction.channel;
    const message = await channel.send({ embeds: [embed] });

    for (const emoji of Object.keys(config.roles)) {
      await message.react(emoji);
    }

    config.savedMessageId = message.id;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    await interaction.reply({ content: 'Reaction roles embed sent!', flags: 64 });
  },
};
