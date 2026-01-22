import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildModerationActionResponse } from "../embeds/moderationActionResponse.js";
import { getLumixVersion } from "../utils/getLumixVersion.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, ensureCanActOnTarget, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to ban").setRequired(true))
    .addIntegerOption((opt) =>
        opt
            .setName("delete_days")
            .setDescription("Delete their recent messages (0-7 days)")
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.ban);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const reasonInput = interaction.options.getString("reason") || "";

    // If user is in guild, do hierarchy checks.
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
        const can = await ensureCanActOnTarget({ guild: interaction.guild, actorMember: m.member, targetMember });
        if (!can.ok) return interaction.reply({ content: can.message, ephemeral: true });

        if (!targetMember.bannable) {
            return interaction.reply({ content: "I can’t ban that member (missing permissions or role hierarchy).", ephemeral: true });
        }
    }

    const reason = normalizeReason(reasonInput, interaction.user);

    await interaction.guild.members.ban(targetUser.id, {
        reason,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    await sendModerationLog(interaction.client, {
        action: "ban",
        moderator: interaction.user,
        target: targetUser,
        deleteDays,
        reason,
        channel: interaction.channel,
    });

    const version = await getLumixVersion();
    const response = buildModerationActionResponse({
        action: "Ban",
        color: 0xe74c3c,
        target: targetUser,
        moderator: interaction.user,
        reason,
        channel: interaction.channel,
        version,
        additionalFields: [
            {
                name: "Messages Cleared",
                value: deleteDays ? `${deleteDays} day(s)` : "No messages deleted",
            },
        ],
    });

    return interaction.reply({ ...response, flags: MessageFlags.IsComponentsV2, ephemeral: true });
}
