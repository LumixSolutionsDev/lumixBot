import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildModerationActionResponse } from "../embeds/moderationActionResponse.js";
import { getLumixVersion } from "../utils/getLumixVersion.js";
import { sendModerationLog } from "../utils/sendModerationLog.js";
import { requireGuild, requireMember, requirePerms, normalizeReason, PERMS } from "../utils/moderationGuards.js";

export const data = new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages in the current channel.")
    .addIntegerOption((opt) =>
        opt
            .setName("amount")
            .setDescription("How many messages to delete (1-100)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
    const g = requireGuild(interaction);
    if (!g.ok) return interaction.reply({ content: g.message, ephemeral: true });

    const m = requireMember(interaction);
    if (!m.ok) return interaction.reply({ content: m.message, ephemeral: true });

    const p = requirePerms(m.member, PERMS.purge);
    if (!p.ok) return interaction.reply({ content: p.message, ephemeral: true });

    const amount = interaction.options.getInteger("amount", true);
    const reasonInput = interaction.options.getString("reason") || "";
    const reason = normalizeReason(reasonInput, interaction.user);

    if (!interaction.channel || !interaction.channel.isTextBased?.()) {
        return interaction.reply({ content: "This command can only be used in a text channel.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const deleted = await interaction.channel.bulkDelete(amount, true);

    await sendModerationLog(interaction.client, {
        action: "purge",
        moderator: interaction.user,
        channel: interaction.channel,
        amount: deleted.size,
        reason,
    });

    const version = await getLumixVersion();
    const response = buildModerationActionResponse({
        action: "Purge",
        color: 0x95a5a6,
        moderator: interaction.user,
        target: null,
        channel: interaction.channel,
        reason,
        version,
        additionalFields: [
            {
                name: "Messages Deleted",
                value: deleted.size ? String(deleted.size) : "0",
            },
        ],
    });

    return interaction.editReply({ ...response, flags: MessageFlags.IsComponentsV2 });
}
