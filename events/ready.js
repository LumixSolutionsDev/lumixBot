import { ActivityType } from "discord.js";

export const name = "clientReady";
export const once = true;

async function updateUserCountPresence(client) {
  const guildId = client.config?.guildId;
  const guild =
    (guildId ? client.guilds.cache.get(guildId) : null) ||
    client.guilds.cache.first() ||
    null;

  if (!client.user) return;

  // memberCount is available without privileged intents; it may be slightly stale.
  const count = guild?.memberCount;
  const serverName = guild?.name || "Lumix Solutions";

  const activityName =
    typeof count === "number" ? `${count} users in ${serverName}` : `users in ${serverName}`;

  client.user.setPresence({
    status: "online",
    activities: [{ type: ActivityType.Watching, name: activityName }],
  });
}

export async function execute(client) {
  console.log(`Logged in as ${client.user.tag}`);

  await updateUserCountPresence(client);

  // Refresh occasionally so the count stays current.
  if (client.__presenceInterval) clearInterval(client.__presenceInterval);
  client.__presenceInterval = setInterval(() => {
    updateUserCountPresence(client).catch(() => {});
  }, 5 * 60 * 1000);
  client.__presenceInterval.unref?.();
}
