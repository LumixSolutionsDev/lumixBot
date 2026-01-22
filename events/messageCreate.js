import { ChannelType, EmbedBuilder } from "discord.js";

export const name = "messageCreate";
export const once = false;

export async function execute(client, message) {
    if (!message?.author || message.author.bot) return;
    if (message.channel?.type !== ChannelType.DM) return;

    const forwardChannelId = client.config?.dmForwardChannelId;
    if (!forwardChannelId) return;

    const targetChannel = await client.channels.fetch(forwardChannelId).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased?.()) return;

    const embed = new EmbedBuilder()
        .setColor(16731212)
        .setTitle("New DM to Lumix Bot")
        .setDescription(message.content?.trim() ? message.content : "*No message content provided.*")
        .addFields(
            {
                name: "Sender",
                value: `${message.author.tag} (${message.author.id})`,
            },
            {
                name: "Message ID",
                value: message.id,
            }
        )
        .setTimestamp(message.createdAt ?? Date.now());

    const attachments = Array.from(message.attachments?.values?.() ?? []);
    if (attachments.length) {
        embed.addFields({
            name: "Attachments",
            value: attachments.map((att, idx) => `${idx + 1}. [${att.name ?? "file"}](${att.url})`).join("\n"),
        });
    }

    await targetChannel.send({
        content: `📥 DM received from **${message.author.tag}**`,
        embeds: [embed],
        allowedMentions: { parse: [] },
    });
}
