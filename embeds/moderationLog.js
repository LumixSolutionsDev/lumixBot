import { EmbedBuilder } from "discord.js";

const COLORS = {
    warn: 0x5865f2,
    timeout: 0xf1c40f,
    untimeout: 0x2ecc71,
    kick: 0xe67e22,
    ban: 0xe74c3c,
    unban: 0x2ecc71,
    purge: 0x95a5a6,
};

function userLabel(user) {
    if (!user) return "Unknown";
    return `${user.tag} (${user.id})`;
}

export function buildModerationLogEmbed({
    action,
    moderator,
    target,
    reason,
    channel,
    duration,
    amount,
    deleteDays,
}) {
    const key = String(action || "").toLowerCase();
    const color = COLORS[key] ?? 0x2f3136;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Moderation • ${String(action || "Action")}`)
        .setTimestamp();

    if (target) {
        embed.addFields({ name: "Target", value: userLabel(target), inline: false });
    }

    if (moderator) {
        embed.addFields({ name: "Moderator", value: userLabel(moderator), inline: false });
    }

    if (channel) {
        const channelValue = channel.url ? `${channel} • ${channel.id}` : `${channel.id}`;
        embed.addFields({ name: "Channel", value: channelValue, inline: false });
    }

    if (typeof amount === "number") {
        embed.addFields({ name: "Amount", value: String(amount), inline: true });
    }

    if (typeof deleteDays === "number") {
        embed.addFields({ name: "Delete Messages", value: `${deleteDays} day(s)`, inline: true });
    }

    if (duration) {
        embed.addFields({ name: "Duration", value: String(duration), inline: true });
    }

    embed.addFields({
        name: "Reason",
        value: reason && String(reason).trim() ? String(reason).slice(0, 1024) : "No reason provided.",
        inline: false,
    });

    return embed;
}
