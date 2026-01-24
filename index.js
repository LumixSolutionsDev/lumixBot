import {
    Client,
    GatewayIntentBits,
    Collection,
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { loadConfig } from "./utils/loadConfig.js";

dotenv.config();

// Load config early so we can decide which intents to request
const config = loadConfig();

const intents = [GatewayIntentBits.Guilds];
// Only request GuildMembers (privileged) if autorole or welcome features are configured
if (config.autoroleId || config.welcomeEmbed || config.welcomeChannelId) {
    intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({ intents });
client.config = config;

client.commands = new Collection();

async function loadCommandsFrom(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await loadCommandsFrom(entryPath);
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

        const module = await import(pathToFileURL(entryPath).href);
        const data = module.data || module.default?.data;
        const execute = module.execute || module.default?.execute;
        if (!data || !execute) continue;
        const name = data.name || (data.toJSON ? data.toJSON().name : null);
        if (!name) continue;
        client.commands.set(name, { data, execute });
    }
}

async function loadCommands() {
    const commandsPath = path.join(process.cwd(), "commands");
    if (!fs.existsSync(commandsPath)) return;
    await loadCommandsFrom(commandsPath);
}

async function init() {
    await loadCommands();

    // expose config on client so event handlers can access it
    client.config = config;

    // load event handlers from /events for easy expansion
    async function loadEvents() {
        const eventsPath = path.join(process.cwd(), "events");
        if (!fs.existsSync(eventsPath)) return;

        const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const module = await import(pathToFileURL(filePath).href);
            const name = module.name || module.default?.name;
            const once = module.once || module.default?.once;
            const execute = module.execute || module.default?.execute;
            if (!name || !execute) continue;

            if (once) {
                client.once(name, (...args) => execute(client, ...args).catch(console.error));
            } else {
                client.on(name, (...args) => execute(client, ...args).catch(console.error));
            }
        }
    }

    await loadEvents();

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: "There was an error while executing this command.", ephemeral: true });
            }
        }
    });

    client.login(process.env.TOKEN);
}

init();