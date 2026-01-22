import https from "node:https";

const VERSION_SOURCE_URL = "https://raw.githubusercontent.com/LumixSolutionsDev/LumixVerisons/main/bot.json";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REQUEST_TIMEOUT_MS = 5000;

let cachedVersion = null;
let cacheExpiresAt = 0;

async function fetchVersionFromSource() {
    const payload = await new Promise((resolve, reject) => {
        const req = https.get(
            VERSION_SOURCE_URL,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": "LumixBot/CompentsV2",
                },
            },
            (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    res.resume();
                    return;
                }

                let raw = "";
                res.setEncoding("utf8");
                res.on("data", (chunk) => {
                    raw += chunk;
                });
                res.on("end", () => resolve(raw));
            }
        );

        req.on("error", reject);
        req.setTimeout(REQUEST_TIMEOUT_MS, () => {
            req.destroy(new Error("Request timed out"));
        });
    });

    const data = JSON.parse(payload || "{}", (_, value) => value);
    const version = typeof data?.version === "string" && data.version.trim() ? data.version.trim() : "Unknown";
    return version;
}

export async function getLumixVersion({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (!forceRefresh && cachedVersion && now < cacheExpiresAt) {
        return cachedVersion;
    }

    try {
        const version = await fetchVersionFromSource();
        cachedVersion = version;
        cacheExpiresAt = now + CACHE_TTL_MS;
        return version;
    } catch (error) {
        if (!cachedVersion) {
            cachedVersion = "Unknown";
            cacheExpiresAt = now + CACHE_TTL_MS;
        }
        return cachedVersion;
    }
}
