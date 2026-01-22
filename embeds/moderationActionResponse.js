import discord from "discord.js";

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SeparatorSpacingSize,
} = discord;

const BUTTON_LINKS = [
    { label: "Lumix Website", url: "https://lumixsolutions.org" },
    { label: "Billing Panel", url: "https://billing.lumixsolutions.org" },
    { label: "Game Panel", url: "https://panel.lumixsolutions.org" },
];

const DEFAULT_ACCENT = 16731212;

function formatUser(user) {
    if (!user) return "Unknown";
    const tag = user.tag || user.username || user.id || "Unknown";
    const id = user.id ? ` (${user.id})` : "";
    return `${tag}${id}`;
}

function configureLinkButtons(row) {
    BUTTON_LINKS.forEach(({ label, url }) => {
        row.addComponents(new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url));
    });
    return row;
}

function buildAdditionalFieldsBlock(additionalFields = []) {
    const rendered = additionalFields
        .filter((field) => field?.name && field?.value)
        .map((field) => `> **${field.name}:** ${String(field.value).slice(0, 1024)}`);
    return rendered.length ? rendered.join("\n") : null;
}

function formatChannel(channel) {
    return channel ? channel?.toString?.() || channel?.name || channel?.id || "Unknown" : "Unknown";
}

export function buildModerationActionResponse({ action, color, target, moderator, reason, channel, additionalFields = [], version }) {
    const summaryBlock = [
        `> **Target:** ${formatUser(target)}`,
        `> **Moderator:** ${formatUser(moderator)}`,
        `> **Channel:** ${formatChannel(channel)}`,
    ].join("\n");

    const reasonText = reason && reason.trim() ? reason.trim() : "No reason provided.";
    const additionalBlock = buildAdditionalFieldsBlock(additionalFields);
    const versionText = version ? `\`${version}\`` : "`Unknown`";

    const container = new ContainerBuilder()
        .setAccentColor(color ?? DEFAULT_ACCENT)
        .addTextDisplayComponents((text) =>
            text.setContent(`### Lumix Action • ${action}\n✅ **${action} completed successfully**`)
        )
        .addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((text) => text.setContent(summaryBlock))
        .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((text) => text.setContent(`> **Reason:** ${reasonText}`));

    if (additionalBlock) {
        container
            .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents((text) => text.setContent(additionalBlock));
    }

    container
        .addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((text) =>
            text.setContent(`Maintened By Lumix Solutions • Version ${versionText}`)
        )
        .addActionRowComponents((row) => configureLinkButtons(row));

    return {
        components: [container],
    };
}
