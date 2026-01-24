import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

const require = createRequire(import.meta.url);
const config = require("./config.json");

(async () => {
    try {
        const commands = [];
        const commandsPath = path.join(process.cwd(), "commands");

        async function collectCommandsFrom(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await collectCommandsFrom(entryPath);
                    continue;
                }

                if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
                const module = await import(pathToFileURL(entryPath).href);
                const cmd = module.data || module.default?.data;
                if (!cmd) continue;
                commands.push(cmd.toJSON ? cmd.toJSON() : cmd);
            }
        }

        if (fs.existsSync(commandsPath)) {
            await collectCommandsFrom(commandsPath);
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
        console.log("Deploying slash commands...");
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );
        console.log("Commands deployed!");
    } catch (error) {
        console.error(error);
    }
})();
