import { SlashCommandBuilder } from "discord.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, ensureCanActOnTarget, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a member's timeout.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to untimeout").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.untimeout);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const reasonInput = interaction.options.getString("reason") || "";

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: "I couldn’t resolve that member in this server.", ephemeral: true });
    }

    const can = await ensureCanActOnTarget({ guild: interaction.guild, actorMember: m.member, targetMember });
    if (!can.ok) return interaction.reply({ content: can.message, ephemeral: true });

    if (!targetMember.moderatable) {
        return interaction.reply({ content: "I can’t untimeout that member (missing permissions or role hierarchy).", ephemeral: true });
    }

    const reason = normalizeReason(reasonInput, interaction.user);

    await targetMember.timeout(null, reason);

    await sendModerationLog(interaction.client, {
        action: "untimeout",
        moderator: interaction.user,
        target: targetUser,
        reason,
        channel: interaction.channel,
    });

    return interaction.reply({ content: `Removed timeout from ${targetUser.tag}.`, ephemeral: true });
}
