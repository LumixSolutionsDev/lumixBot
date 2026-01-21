import fs from "fs";
import path from "path";

export function loadConfig() {
    const configPath = path.join(process.cwd(), "config.json");
    if (!fs.existsSync(configPath)) return {};

    try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
        console.warn("Failed to parse config.json:", err?.message || err);
        return {};
    }
}
