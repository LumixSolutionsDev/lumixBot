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
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs
                .readdirSync(commandsPath)
                .filter((file) => file.endsWith(".js"));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const module = await import(pathToFileURL(filePath).href);
                const cmd = module.data || module.default?.data;
                if (!cmd) continue;
                commands.push(cmd.toJSON ? cmd.toJSON() : cmd);
            }
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
