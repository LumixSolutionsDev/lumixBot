import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildModerationActionResponse } from "../embeds/moderationActionResponse.js";
import { getLumixVersion } from "../utils/getLumixVersion.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, ensureCanActOnTarget, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user (logs the warning).")
    .addUserOption((opt) => opt.setName("user").setDescription("User to warn").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the warning").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.warn);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const reasonInput = interaction.options.getString("reason") || "";

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: "I couldn’t resolve that member in this server.", ephemeral: true });
    }

    const can = await ensureCanActOnTarget({ guild: interaction.guild, actorMember: m.member, targetMember });
    if (!can.ok) return interaction.reply({ content: can.message, ephemeral: true });

    const reason = normalizeReason(reasonInput, interaction.user);

    await sendModerationLog(interaction.client, {
        action: "warn",
        moderator: interaction.user,
        target: targetUser,
        reason,
        channel: interaction.channel,
    });

    const version = await getLumixVersion();
    const response = buildModerationActionResponse({
        action: "Warn",
        color: 16731212,
        target: targetUser,
        moderator: interaction.user,
        reason,
        channel: interaction.channel,
        version,
    });

    return interaction.reply({ ...response, flags: MessageFlags.IsComponentsV2, ephemeral: true });
}
