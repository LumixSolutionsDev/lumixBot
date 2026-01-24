import discord from "discord.js";
import { getServers } from "../../utils/pterodactylApi.js";
import { getLumixVersion } from "../../utils/getLumixVersion.js";

const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
} = discord;

const ACCENT = 16731212;

function buildButtons(row) {
    row.addComponents(
        new ButtonBuilder().setLabel("Panel").setStyle(ButtonStyle.Link).setURL("https://panel.lumixsolutions.org"),
        new ButtonBuilder().setLabel("Status").setStyle(ButtonStyle.Link).setURL("https://status.lumixsolutions.org")
    );
    return row;
}

function buildContainer({ title, sections, footer }) {
    const container = new ContainerBuilder().setAccentColor(ACCENT);
    if (title) {
        container.addTextDisplayComponents((text) => text.setContent(`### ${title}`));
    }

    if (sections?.length) {
        sections.forEach((section, idx) => {
            container.addSeparatorComponents((separator) =>
                separator.setDivider(idx === 0).setSpacing(SeparatorSpacingSize.Small)
            );
            container.addTextDisplayComponents((text) => text.setContent(section));
        });
    }

    if (footer) {
        container
            .addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents((text) => text.setContent(footer));
    }

    container.addActionRowComponents((row) => buildButtons(row));
    return container;
}

function formatServer(server) {
    const allocations = server.relationships?.allocations?.data || [];
    const primaryAllocation = allocations.find((alloc) => alloc.attributes?.is_default) || allocations[0];
    const primaryPort = primaryAllocation?.attributes
        ? `${primaryAllocation.attributes.ip}:${primaryAllocation.attributes.port}`
        : "Unknown";

    const limits = server.limits || {};
    const featureLimits = server.feature_limits || {};

    return [
        `**${server.name}** (ID ${server.id})`,
        `Identifier: ${server.identifier}`,
        `UUID: ${server.uuid}`,
        `Node ID: ${server.node}`,
        `Owner ID: ${server.user}`,
        `Description: ${server.description || "*None provided*"}`,
        `Primary Allocation: ${primaryPort}`,
        `Limits: CPU ${limits.cpu ?? "n/a"}% • RAM ${limits.memory ?? "n/a"} MB • Disk ${limits.disk ?? "n/a"} MB`,
        `Feature Limits: Databases ${featureLimits.databases ?? 0} • Allocations ${featureLimits.allocations ?? 0} • Backups ${featureLimits.backups ?? 0}`,
    ].join("\n");
}

function displayServer(server) {
    return [
        formatServer(server),
        `Suspended: ${server.suspended ? "Yes" : "No"}`,
        `Status: ${server.status || "unknown"}`,
    ].join("\n");
}

function findServer(servers, query) {
    if (!query) return null;
    const lower = query.toLowerCase();
    return (
        servers.find((srv) => srv.uuid?.toLowerCase() === lower) ||
        servers.find((srv) => srv.identifier?.toLowerCase() === lower) ||
        servers.find((srv) => srv.uuid?.startsWith(lower)) ||
        servers.find((srv) => srv.identifier?.startsWith(lower)) ||
        servers.find((srv) => String(srv.id) === query)
    );
}

export const data = new SlashCommandBuilder()
    .setName("slookup")
    .setDescription("Lookup a Pterodactyl server by UUID or identifier.")
    .addStringOption((opt) =>
        opt
            .setName("server")
            .setDescription("Server UUID, identifier, or numeric ID")
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const [serverList, version] = await Promise.all([
            getServers(interaction.client, { include: "allocations" }),
            getLumixVersion(),
        ]);

        const query = interaction.options.getString("server", true).trim();
        const server = findServer(serverList, query);
        if (!server) {
            return interaction.editReply({ content: `No server found for query \\"${query}\\".` });
        }

        const sections = [displayServer(server)];
        const container = buildContainer({
            title: `Server Lookup • ${server.name}`,
            sections,
            footer: `Lumix Solutions • Version ${version ? `\`${version}\`` : "`Unknown`"}`,
        });

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
        console.error("/slookup failed", error);
        return interaction.editReply({ content: "Failed to query Pterodactyl API." });
    }
}
