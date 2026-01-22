import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildModerationActionResponse } from "../embeds/moderationActionResponse.js";
import { getLumixVersion } from "../utils/getLumixVersion.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { parseDurationToMs, formatDurationMs } from "../utils/parseDuration.js";
import { requireGuild, requireMember, requirePerms, ensureCanActOnTarget, normalizeReason, PERMS } from "../utils/moderationGuards.js";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export const data = new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member for a duration.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to timeout").setRequired(true))
    .addStringOption((opt) =>
        opt
            .setName("duration")
            .setDescription("Duration like 10m, 2h, 3d (max 28d)")
            .setRequired(true)
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the timeout").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.timeout);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const durationRaw = interaction.options.getString("duration", true);
    const reasonInput = interaction.options.getString("reason") || "";

    const ms = parseDurationToMs(durationRaw);
    if (!ms) {
        return interaction.reply({ content: "Invalid duration. Use formats like `10m`, `2h`, `3d`.", ephemeral: true });
    }
    if (ms > MAX_TIMEOUT_MS) {
        return interaction.reply({ content: "Timeout duration can’t exceed 28 days.", ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: "I couldn’t resolve that member in this server.", ephemeral: true });
    }

    const can = await ensureCanActOnTarget({ guild: interaction.guild, actorMember: m.member, targetMember });
    if (!can.ok) return interaction.reply({ content: can.message, ephemeral: true });

    if (!targetMember.moderatable) {
        return interaction.reply({ content: "I can’t timeout that member (missing permissions or role hierarchy).", ephemeral: true });
    }

    const reason = normalizeReason(reasonInput, interaction.user);

    await targetMember.timeout(ms, reason).catch((err) => {
        throw err;
    });

    await sendModerationLog(interaction.client, {
        action: "timeout",
        moderator: interaction.user,
        target: targetUser,
        duration: formatDurationMs(ms),
        reason,
        channel: interaction.channel,
    });

    const version = await getLumixVersion();
    const response = buildModerationActionResponse({
        action: "Timeout",
        color: 16731212,
        target: targetUser,
        moderator: interaction.user,
        reason,
        channel: interaction.channel,
        version,
        additionalFields: [
            {
                name: "Duration",
                value: formatDurationMs(ms),
            },
        ],
    });

    return interaction.reply({ ...response, flags: MessageFlags.IsComponentsV2, ephemeral: true });
}
