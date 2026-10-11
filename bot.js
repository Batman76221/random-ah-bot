const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

let idData = JSON.parse(fs.readFileSync('./id.json', 'utf8'));
let bugCounter = idData.bugCounter || 1;
let bugs = new Map(Object.entries(idData.bugs || {}));

function saveIdData() {
  fs.writeFileSync('./id.json', JSON.stringify({ bugCounter, bugs: Object.fromEntries(bugs) }, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
const commandsData = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandsData });
  console.log('Slash commands registered.');

  if (config.savedMessageId) {
    try {
      const channel = await client.channels.fetch(config.reactionRolesChannelId);
      await channel.messages.fetch(config.savedMessageId);
      console.log('Reaction roles message re-fetched.');
    } catch {
      console.log('Could not re-fetch saved message.');
    }
  }
});

client.on('interactionCreate', async interaction => { try {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    if (interaction.commandName === 'fix') return command.execute(interaction, bugs, saveIdData);
    await command.execute(interaction);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'bugReportModal') {
    const bug = interaction.fields.getTextInputValue('bug');
    const bugTypeRaw = interaction.fields.getTextInputValue('bugType').toLowerCase().trim();
    const proofLink = interaction.fields.getTextInputValue('proofLink');

    if (!['major', 'small'].includes(bugTypeRaw)) {
      return interaction.reply({ content: 'Bug type must be **major** or **small**.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const links = proofLink.split(/\s+/).filter(l => { try { new URL(l); return true; } catch { return false; } });
    const bugId = bugCounter++;
    const color = bugTypeRaw === 'major' ? '#FF0000' : '#FFA500';

    const embed = new EmbedBuilder()
      .setTitle(`Bug Report #${bugId}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Reporter', value: `${interaction.user} (${interaction.user.id})`, inline: false },
        { name: 'Description', value: bug, inline: false },
        { name: 'Type', value: bugTypeRaw === 'major' ? 'Major' : 'Small', inline: true },
        { name: 'Reported At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: 'Proof', value: links.length ? links.join('\n') : proofLink, inline: false }
      )
      .setColor(color)
      .setTimestamp();

    if (links.length > 0) embed.setImage(links[0]);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`fixed_${bugId}`).setLabel('Mark Fixed').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`unfixed_${bugId}`).setLabel('Still Unfixed').setStyle(ButtonStyle.Danger)
    );

    const embeds = [embed];
    for (let i = 1; i < links.length && i < 4; i++) {
      embeds.push(new EmbedBuilder().setImage(links[i]).setColor(color));
    }

    const logChannel = await client.channels.fetch(config.logChannelId);
    const message = await logChannel.send({
      content: `New Bug Report from **${interaction.guild.name}** <@&${config.developerRoleId}>`,
      embeds,
      components: [row]
    });

    bugs.set(bugId.toString(), { userId: interaction.user.id, messageId: message.id });
    saveIdData();

    await interaction.channel.send(`${interaction.user} your bug report **#${bugId}** has been submitted!`);

    try {
      await interaction.user.send(`Bug report **#${bugId}** submitted! A developer will review it soon.`);
      await interaction.editReply({ content: 'Report submitted! Check your DMs for confirmation.' });
    } catch {
      await interaction.editReply({ content: `Report submitted! Your Bug ID is **#${bugId}**.` });
    }
  }

  if (interaction.isButton() && (interaction.customId.startsWith('fixed_') || interaction.customId.startsWith('unfixed_'))) {
    if (!interaction.member.roles.cache.has(config.developerRoleId)) {
      return interaction.reply({ content: 'Only developers can use these buttons.', ephemeral: true }).catch(() => {});
    }

    const [action, bugId] = interaction.customId.split('_');
    const isFixed = action === 'fixed';

    const modal = new ModalBuilder()
      .setCustomId(`bugMsg_${action}_${bugId}`)
      .setTitle(isFixed ? `Fix Bug #${bugId}` : `Still Unfixed - Bug #${bugId}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('devMessage')
          .setLabel(isFixed ? 'Message to send the reporter' : 'Reason / feedback for reporter')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(isFixed ? 'e.g. Fixed in the latest update!' : 'e.g. We are still looking into this...')
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'updateModal') {
    const version = interaction.fields.getTextInputValue('version').trim();
    const addedRaw = interaction.fields.getTextInputValue('added').trim();
    const removedRaw = interaction.fields.getTextInputValue('removed').trim();

    const fmt = (lines, prefix) =>
      lines.split('\n').filter(l => l.trim()).map(l => `${prefix} ${l.trim()}`).join('\n');

    let changelog = '';
    if (addedRaw) changelog += `\`\`\`diff\n${fmt(addedRaw, '+')}\n\`\`\``;
    if (removedRaw) changelog += `\`\`\`diff\n${fmt(removedRaw, '-')}\n\`\`\``;

    if (!changelog) {
      return interaction.reply({ content: 'Please provide at least one added or removed item.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Game Update ${version}`)
      .setDescription(changelog)
      .setColor('#ffffff')
      .setFooter({ text: `Posted by ${interaction.user.tag}` })
      .setTimestamp();

    const updateChannel = await client.channels.fetch(config.updateChannelId);
    await updateChannel.send({ embeds: [embed] });

    await interaction.reply({ content: `Update **${version}** posted!`, ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('bugMsg_')) {
    const [, action, bugId] = interaction.customId.split('_');
    const devMessage = interaction.fields.getTextInputValue('devMessage');
    const bugData = bugs.get(bugId);
    const isFixed = action === 'fixed';

    try {
      const user = await client.users.fetch(bugData.userId);
      const dmEmbed = new EmbedBuilder()
        .setTitle(isFixed ? `Bug #${bugId} Fixed!` : `Bug #${bugId} Still In Progress`)
        .setDescription(devMessage)
        .setColor(isFixed ? '#00FF00' : '#FFA500')
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch { /* DMs closed */ }

    if (isFixed && bugData) {
      try {
        const logChannel = await client.channels.fetch(config.logChannelId);
        const message = await logChannel.messages.fetch(bugData.messageId);
        await message.edit({ components: [] });
      } catch { /* message deleted */ }
      bugs.delete(bugId);
      saveIdData();
    }

    await interaction.reply({ content: `Reporter notified for bug **#${bugId}**.`, ephemeral: true });
  }
  } catch (err) {
    console.error('Interaction error:', err);
    try {
      const msg = { content: 'Something went wrong. Please try again.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch { /* interaction already dead */ }
  }
});

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  if (reaction.message.id !== config.savedMessageId) return;

  if (reaction.partial) await reaction.fetch();

  const roleId = config.roles[reaction.emoji.name];
  if (!roleId) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);

  try {
    if (add) {
      await member.roles.add(roleId);
    } else {
      await member.roles.remove(roleId);
    }
  } catch (err) {
    console.error(`Failed to ${add ? 'add' : 'remove'} role ${roleId} for ${user.tag}: ${err.message}`);
  }
}

client.on('messageReactionAdd', (reaction, user) => handleReaction(reaction, user, true));
client.on('messageReactionRemove', (reaction, user) => handleReaction(reaction, user, false));

client.login(config.token);
