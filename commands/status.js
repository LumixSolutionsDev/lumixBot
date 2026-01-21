import { SlashCommandBuilder } from "discord.js";
import checkService from "../utils/checkService.js";
import createStatusEmbed from "../embeds/status.js";

// Configure your services here. This is intentionally hardcoded per request.
// Add objects with `name` and `url` fields. Example:
// { name: 'Website', url: 'https://example.com' }
const SERVICES = [
    { name: "Lumix Website", url: "https://lumixsolutions.org" },
    { name: "Lumix Billing Panel", url: "https://billing.lumixsolutions.org" },
    { name: "Lumix Game Panel", url: "https://panel.lumixsolutions.org" },
];

// Helper to run all service checks and build the embed
async function buildStatusEmbed() {
    const checks = await Promise.all(
        SERVICES.map(async (s) => {
            const res = await checkService(s.url, 5000);
            return { name: s.name, url: s.url, ...res };
        })
    );

    return createStatusEmbed(checks);
}

// Key used for tracking status message per guild/channel
function makeTrackerKey(guildId, channelId) {
    return `${guildId || "global"}:${channelId}`;
}

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Checks status of configured services and posts an embed, then keeps it updated.");

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const client = interaction.client;
    if (!client.statusTrackers) {
        client.statusTrackers = new Map();
    }

    const key = makeTrackerKey(interaction.guildId, interaction.channelId);
    const existing = client.statusTrackers.get(key) || null;
    const embed = await buildStatusEmbed();

    let message = null;
    if (existing) {
        try {
            const channel = await client.channels.fetch(interaction.channelId);
            const fetchedMessage = await channel.messages.fetch(existing.messageId);
            await fetchedMessage.edit({ embeds: [embed] });
            message = fetchedMessage;
        } catch {
            // If fetching/editing fails (message deleted, missing perms, etc.), fall back to sending a new one.
        }
    }

    if (!message && interaction.channel) {
        message = await interaction.channel.send({ embeds: [embed] });
    }

    if (message) {
        let tracker = client.statusTrackers.get(key) || {};
        tracker.messageId = message.id;
        tracker.channelId = interaction.channelId;
        tracker.guildId = interaction.guildId;

        // Only create a new interval if one doesn't already exist for this channel
        if (!tracker.intervalId) {
            const intervalId = setInterval(async () => {
                try {
                    const currentTracker = client.statusTrackers.get(key);
                    if (!currentTracker) {
                        clearInterval(intervalId);
                        return;
                    }

                    const latestEmbed = await buildStatusEmbed();
                    const channel = await client.channels.fetch(currentTracker.channelId);
                    const statusMessage = await channel.messages.fetch(currentTracker.messageId);
                    await statusMessage.edit({ embeds: [latestEmbed] });
                } catch (err) {
                    // If we can't update the message anymore, stop tracking for this channel
                    client.statusTrackers.delete(key);
                    clearInterval(intervalId);
                }
            }, 60 * 1000);

            intervalId.unref?.();
            tracker.intervalId = intervalId;
        }

        client.statusTrackers.set(key, tracker);
    }

    await interaction.editReply({ content: "Status posted and will update every minute!", ephemeral: true });
}
