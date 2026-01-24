import discord from "discord.js";
import {
    getNodes,
    getServers,
    summarizeNodeResources,
    evaluateAlerts,
    formatPercent,
    formatMegabytes,
    resolveNode,
    getThresholds,
} from "../../utils/pterodactylApi.js";
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
const BUTTON_LINKS = [
    { label: "Status Page", url: "https://status.lumixsolutions.org" },
    { label: "Ptero Panel", url: "https://panel.lumixsolutions.org" },
];

function configureLinks(row) {
    BUTTON_LINKS.forEach(({ label, url }) => {
        row.addComponents(new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url));
    });
    return row;
}

function buildContainer({ title, sections, footer }) {
    const container = new ContainerBuilder().setAccentColor(ACCENT);
    if (title) {
        container.addTextDisplayComponents((text) => text.setContent(`### ${title}`));
    }

    if (sections?.length) {
        sections.forEach((section, index) => {
            container.addSeparatorComponents((separator) =>
                separator.setDivider(index === 0).setSpacing(SeparatorSpacingSize.Small)
            );
            container.addTextDisplayComponents((text) => text.setContent(section));
        });
    }

    if (footer) {
        container
            .addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents((text) => text.setContent(footer));
    }

    container.addActionRowComponents((row) => configureLinks(row));
    return container;
}

const cpuFormatter = (value) => `${value ?? 0}%`;

function padLabel(label) {
    return label.padEnd(7, " ");
}

function formatUsageLine(label, used, total, percent, formatter = formatMegabytes) {
    if (!total) {
        return `${padLabel(label)}   N/A   (no allocation)`;
    }
    const percentText = formatPercent(percent);
    const usedText = formatter(used);
    const totalText = formatter(total);
    return `${padLabel(label)} ${percentText.padStart(8)}  (${usedText} / ${totalText})`;
}

function codeBlock(lines, language = "yaml") {
    return ["```" + language, ...lines, "```"].join("\n");
}

function formatNodeSummary(node, stats, thresholds) {
    const alertList = evaluateAlerts(stats, thresholds);
    const alertLine = alertList.length ? `> ⚠️ **Alerts:** ${alertList.join(", ")}` : "> ✅ Within thresholds";
    const serverLine = stats.statusKnown
        ? `> Servers Online: **${stats.onlineServers}/${stats.totalServers}**`
        : `> Servers Provisioned: **${stats.totalServers}**`;

    const resourcesBlock = codeBlock([
        formatUsageLine("CPU", stats.allocatedCpu, stats.totalCpu, stats.cpuPercent, cpuFormatter),
        formatUsageLine("RAM", stats.usedMemory, stats.totalMemory, stats.memoryPercent),
        formatUsageLine("Disk", stats.usedDisk, stats.totalDisk, stats.diskPercent),
    ]);

    return [
        `**${node.name}** (ID ${node.id})`,
        serverLine,
        resourcesBlock,
        alertLine,
    ].join("\n");
}

function formatNodeInfo(node, stats) {
    const meta = [
        `> Location: **${node.location_id}** • Public: **${node.public ? "Yes" : "No"}**`,
        `> FQDN: \`${node.fqdn}\``,
        `> Daemon: ${node.daemon_base}:${node.daemon_listen} (SFTP ${node.daemon_sftp})`,
        `> Overallocation: RAM ${node.memory_overallocate}% • Disk ${node.disk_overallocate}%`,
    ];

    const resourceBlock = stats
        ? codeBlock([
              formatUsageLine("CPU", stats.allocatedCpu, stats.totalCpu, stats.cpuPercent, cpuFormatter),
              formatUsageLine("RAM", stats.usedMemory, stats.totalMemory, stats.memoryPercent),
              formatUsageLine("Disk", stats.usedDisk, stats.totalDisk, stats.diskPercent),
              stats.statusKnown
                  ? `Servers ${stats.onlineServers}/${stats.totalServers} online`
                  : `Servers provisioned ${stats.totalServers}`,
          ])
        : "";

    return [
        `**${node.name}** (ID ${node.id})`,
        ...meta,
        resourceBlock,
    ]
        .filter(Boolean)
        .join("\n");
}

function formatUsageDetail(node, stats, thresholds) {
    const alerts = evaluateAlerts(stats, thresholds);
    const alertLine = alerts.length ? `> ⚠️ **Alerts:** ${alerts.join(", ")}` : "> ✅ No threshold alerts";
    const serversLine = stats.statusKnown
        ? `> Servers Online: **${stats.onlineServers}/${stats.totalServers}**`
        : `> Servers Provisioned: **${stats.totalServers}** (status unavailable)`;

    const usageBlock = codeBlock([
        formatUsageLine("CPU", stats.allocatedCpu, stats.totalCpu, stats.cpuPercent, cpuFormatter),
        formatUsageLine("RAM", stats.usedMemory, stats.totalMemory, stats.memoryPercent),
        formatUsageLine("Disk", stats.usedDisk, stats.totalDisk, stats.diskPercent),
    ]);

    return [
        `**${node.name}** usage snapshot`,
        serversLine,
        usageBlock,
        alertLine,
    ].join("\n");
}

async function gatherInfrastructure(client) {
    const [nodes, servers] = await Promise.all([getNodes(client), getServers(client)]);
    return { nodes, servers };
}

export const data = new SlashCommandBuilder()
    .setName("node")
    .setDescription("Inspect Pterodactyl nodes")
    .addSubcommand((sub) => sub.setName("status").setDescription("Show summary for all nodes"))
    .addSubcommand((sub) =>
        sub
            .setName("info")
            .setDescription("Detailed information about a node")
            .addStringOption((opt) => opt.setName("node").setDescription("Node ID, UUID, identifier, or name").setRequired(true))
    )
    .addSubcommand((sub) =>
        sub
            .setName("usage")
            .setDescription("Resource usage for a node")
            .addStringOption((opt) => opt.setName("node").setDescription("Node ID, UUID, identifier, or name").setRequired(true))
    );

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;

    try {
        const [{ nodes, servers }, version] = await Promise.all([gatherInfrastructure(client), getLumixVersion()]);
        if (!nodes.length) {
            return interaction.editReply({ content: "No nodes found in Pterodactyl API response." });
        }

        const thresholds = getThresholds(client);
        let sections;

        if (sub === "status") {
            sections = nodes.map((node) => {
                const stats = summarizeNodeResources(node, servers);
                return formatNodeSummary(node, stats, thresholds);
            });
            const container = buildContainer({
                title: "Lumix Nodes • Status",
                sections,
                footer: `Lumix Solutions • Version ${version ? `\`${version}\`` : "`Unknown`"}`,
            });
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const nodeInput = interaction.options.getString("node", true).trim();
        const node = resolveNode(nodes, nodeInput);
        if (!node) {
            return interaction.editReply({ content: `Could not find a node matching \\"${nodeInput}\\".` });
        }
        const stats = summarizeNodeResources(node, servers);

        if (sub === "info") {
            sections = [formatNodeInfo(node, stats)];
            const container = buildContainer({
                title: `Node Info • ${node.name}`,
                sections,
                footer: `Lumix Solutions • Version ${version ? `\`${version}\`` : "`Unknown`"}`,
            });
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === "usage") {
            sections = [formatUsageDetail(node, stats, thresholds)];
            const container = buildContainer({
                title: `Node Usage • ${node.name}`,
                sections,
                footer: `Lumix Solutions • Version ${version ? `\`${version}\`` : "`Unknown`"}`,
            });
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        return interaction.editReply({ content: "Unsupported subcommand." });
    } catch (error) {
        console.error("/node command failed", error);
        return interaction.editReply({ content: "Failed to query Pterodactyl API. Please try again later." });
    }
}
