import { buildModerationLogEmbed } from "../embeds/moderationLog.js";

export async function sendModerationLog(client, payload) {
    const logChannelId = client?.config?.logChannelId;
    if (!logChannelId) return;

    try {
        const channel = await client.channels.fetch(logChannelId);
        if (!channel || !channel.isTextBased?.()) return;

        const embed = buildModerationLogEmbed(payload);
        await channel.send({ embeds: [embed] });
    } catch {
        // Intentionally ignore logging failures so mod actions still succeed.
    }
}
