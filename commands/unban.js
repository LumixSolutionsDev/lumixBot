import { SlashCommandBuilder } from "discord.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by ID.")
    .addStringOption((opt) => opt.setName("user_id").setDescription("User ID to unban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.unban);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const userId = interaction.options.getString("user_id", true).trim();
    const reasonInput = interaction.options.getString("reason") || "";

    if (!/^\d{15,25}$/.test(userId)) {
        return interaction.reply({ content: "That doesn’t look like a valid Discord user ID.", ephemeral: true });
    }

    const reason = normalizeReason(reasonInput, interaction.user);

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);

    await interaction.guild.bans.remove(userId, reason);

    await sendModerationLog(interaction.client, {
        action: "unban",
        moderator: interaction.user,
        target: ban?.user ?? { id: userId, tag: `Unknown (${userId})` },
        reason,
        channel: interaction.channel,
    });

    return interaction.reply({ content: `Unbanned ${ban?.user?.tag || userId}.`, ephemeral: true });
}
