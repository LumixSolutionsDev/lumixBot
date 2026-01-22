import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildModerationActionResponse } from "../embeds/moderationActionResponse.js";
import { getLumixVersion } from "../utils/getLumixVersion.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, ensureCanActOnTarget, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.kick);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const reasonInput = interaction.options.getString("reason") || "";

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: "I couldn’t resolve that member in this server.", ephemeral: true });
    }

    const can = await ensureCanActOnTarget({ guild: interaction.guild, actorMember: m.member, targetMember });
    if (!can.ok) return interaction.reply({ content: can.message, ephemeral: true });

    if (!targetMember.kickable) {
        return interaction.reply({ content: "I can’t kick that member (missing permissions or role hierarchy).", ephemeral: true });
    }

    const reason = normalizeReason(reasonInput, interaction.user);

    await targetMember.kick(reason);

    await sendModerationLog(interaction.client, {
        action: "kick",
        moderator: interaction.user,
        target: targetUser,
        reason,
        channel: interaction.channel,
    });

    const version = await getLumixVersion();
    const response = buildModerationActionResponse({
        action: "Kick",
        target: targetUser,
        moderator: interaction.user,
        reason,
        channel: interaction.channel,
        version,
    });

    return interaction.reply({ ...response, flags: MessageFlags.IsComponentsV2, ephemeral: true });
}
