import discord from "discord.js";
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    TextDisplayBuilder,
} = discord;
import { getLumixVersion } from "../utils/getLumixVersion.js";

function buildLinkRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Status").setStyle(ButtonStyle.Link).setURL("https://status.lumixsolutions.org"),
        new ButtonBuilder().setLabel("Website").setStyle(ButtonStyle.Link).setURL("https://lumixsolutions.org")
    );
}

function formatMetrics({ ws, api }) {
    return [`> **WebSocket:** \`${ws}ms\``, `> **Round Trip:** \`${api}ms\``].join("\n");
}

export const data = new SlashCommandBuilder().setName("ping").setDescription("Shows the bot latency in Components V2 style.");

export async function execute(interaction) {
    const now = Date.now();
    const wsPing = Math.round(interaction.client.ws.ping || 0);
    const apiPing = Math.max(0, now - interaction.createdTimestamp);
    const version = await getLumixVersion();

    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents((text) =>
            text.setContent("### Lumix Network Pulse\nChecking infrastructure responsiveness")
        )
        .addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((text) => text.setContent(formatMetrics({ ws: wsPing, api: apiPing })))
        .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((text) =>
            text.setContent(`Maintened By Lumix Solutions • Version ${version ? `\`${version}\`` : "`Unknown`"}`)
        )
        .addActionRowComponents((row) => row.setComponents(buildLinkRow().components));

    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}
