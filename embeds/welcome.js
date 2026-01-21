import { EmbedBuilder } from "discord.js";

export default function welcomeEmbed(client, member, config) {
    const embed = new EmbedBuilder()
        .setColor(16731212)
        .setTitle(`<:Lumix:1454282504444837970> Welcome to ${member.guild.name}`)
        .setDescription(
            `Welcome ${member.user}, we're happy to have you. Please take a moment to review important information below to get started.`
        )
        .addFields(
            { name: "Getting Started", value: "For information about Lumix, please read <#1454280522262908938>.\nFor basic questions, please read <#1454280506744115361>." },
            { name: "Support", value: "For account or billing assistance, contact support through the [website](https://billing.lumixsolutions.org)." }
        )
        .setTimestamp()
        .setFooter({ text: `Lumix Solutions • ${member.user.tag}` });

    const content = `<@${member.id}>`;
    return { content, embeds: [embed] };
}
