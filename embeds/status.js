import { EmbedBuilder } from "discord.js";

// Optional: drop your CDN logo URL here to show on the embed
// Example: "https://cdn.yoursite.com/logo.png"
const STATUS_LOGO_URL = "https://cdn.lumixsolutions.org/images/logo.png";

export default function createStatusEmbed(results) {
    const total = results.length;
    const onlineCount = results.filter((r) => r.ok).length;

    const embed = new EmbedBuilder()
        .setTitle("Service Status")
        .setColor(0x00ae86)
        .setDescription(
            `Monitoring ${total} services • **${onlineCount}/${total} online**`
        )
        .setTimestamp()
        .setFooter({ text: "Auto-updates every minute" });

    if (STATUS_LOGO_URL) {
        embed.setThumbnail(STATUS_LOGO_URL);
    }

    const fields = results.map((r) => {
        const emoji = r.ok ? "🟢" : "🔴";
        const statusText = r.ok
            ? `Online (${r.statusCode})`
            : `Offline${r.error ? ` — ${r.error}` : ""}`;
        const timeText = r.time ? ` • ${r.time}ms` : "";
        return {
            name: `${emoji} ${r.name}`,
            // Discord embeds don't support markdown-style links in fields,
            // but raw or angle-bracket URLs are clickable.
            value: `<${r.url}>\n**Status:** ${statusText}${r.ok ? timeText : ""}`,
            inline: false,
        };
    });

    embed.addFields(fields);
    return embed;
}
