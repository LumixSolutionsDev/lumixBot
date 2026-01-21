import http from "http";
import https from "https";

export default function checkService(rawUrl, timeout = 5000) {
    return new Promise((resolve) => {
        let url;
        try {
            url = new URL(rawUrl);
        } catch (err) {
            return resolve({ ok: false, error: "invalid_url" });
        }

        const lib = url.protocol === "https:" ? https : http;
        const start = Date.now();

        const req = lib.request(
            {
                method: "GET",
                hostname: url.hostname,
                port: url.port || (url.protocol === "https:" ? 443 : 80),
                path: url.pathname + url.search,
                timeout,
            },
            (res) => {
                const time = Date.now() - start;
                // consume data so the socket can close
                res.on("data", () => { });
                res.on("end", () => {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode, time });
                });
            }
        );

        req.on("error", (err) => resolve({ ok: false, error: err.message }));
        req.on("timeout", () => {
            req.destroy();
            resolve({ ok: false, error: "timeout" });
        });
        req.end();
    });
}
