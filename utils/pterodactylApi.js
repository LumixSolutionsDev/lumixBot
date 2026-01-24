const DEFAULT_PER_PAGE = 50;
const DEFAULT_SERVER_INCLUDE = "allocations,node";

function getPteroConfig(client) {
    const cfg = client?.config?.pterodactyl;
    if (!cfg || !cfg.baseUrl || !cfg.apiKey) {
        throw new Error("Pterodactyl API is not configured. Set baseUrl and apiKey in config.json.");
    }
    return cfg;
}

function normalizeBaseUrl(baseUrl) {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function applicationRequest(client, endpoint, { searchParams } = {}) {
    const cfg = getPteroConfig(client);
    const base = normalizeBaseUrl(cfg.baseUrl);
    const url = new URL(endpoint.startsWith("/") ? endpoint : `/${endpoint}`, `${base}`);

    if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.set(key, value);
        });
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Pterodactyl API request failed (${response.status}): ${text || response.statusText}`);
    }

    return response.json();
}

async function fetchPaginated(client, endpoint, { params = {} } = {}) {
    let page = 1;
    const all = [];
    while (true) {
        const searchParams = { per_page: DEFAULT_PER_PAGE, page, ...params };
        const data = await applicationRequest(client, endpoint, { searchParams });
        if (!Array.isArray(data?.data)) break;
        all.push(...data.data);
        const totalPages = data?.meta?.pagination?.total_pages ?? 1;
        if (page >= totalPages) break;
        page += 1;
    }
    return all;
}

export async function getNodes(client) {
    const data = await fetchPaginated(client, "/api/application/nodes");
    return data.map((item) => item.attributes);
}

export async function getServers(client, { include } = {}) {
    const params = { include: include || DEFAULT_SERVER_INCLUDE };
    const data = await fetchPaginated(client, "/api/application/servers", { params });
    return data.map((item) => {
        const base = item.attributes || item;
        return {
            ...base,
            relationships: item.relationships || {},
        };
    });
}

export function resolveNode(nodes, identifier) {
    if (!identifier) return null;
    const target = identifier.toLowerCase();
    return (
        nodes.find((n) => String(n.id) === identifier) ||
        nodes.find((n) => n.uuid?.toLowerCase() === target) ||
        nodes.find((n) => n.identifier?.toLowerCase?.() === target) ||
        nodes.find((n) => n.name?.toLowerCase() === target)
    );
}

export function getThresholds(client) {
    const defaults = { cpu: 80, memory: 85, disk: 90 };
    const cfg = client?.config?.pterodactyl?.thresholds;
    if (!cfg) return defaults;
    return {
        cpu: Number.isFinite(cfg.cpu) ? Number(cfg.cpu) : defaults.cpu,
        memory: Number.isFinite(cfg.memory) ? Number(cfg.memory) : defaults.memory,
        disk: Number.isFinite(cfg.disk) ? Number(cfg.disk) : defaults.disk,
    };
}

function sumLimit(servers, key) {
    return servers.reduce((acc, srv) => acc + (srv?.limits?.[key] || 0), 0);
}

export function summarizeNodeResources(node, servers = []) {
    const nodeServers = servers.filter((srv) => srv.node === node.id);
    const allocated = node?.allocated_resources ?? {};
    const totalMemory = Number(node?.memory) || 0;
    const totalDisk = Number(node?.disk) || 0;
    const totalCpu = Number(node?.cpu) || 0;

    const memorySum = sumLimit(nodeServers, "memory");
    const diskSum = sumLimit(nodeServers, "disk");
    const cpuSum = sumLimit(nodeServers, "cpu");

    const usedMemory = memorySum || Number(allocated.memory) || 0;
    const usedDisk = diskSum || Number(allocated.disk) || 0;
    const allocatedCpu = cpuSum || Number(allocated.cpu) || 0;

    const statusKnown = nodeServers.some((srv) => typeof srv?.status === "string");
    const onlineServers = statusKnown ? nodeServers.filter((srv) => srv.status === "running").length : null;

    return {
        totalMemory,
        usedMemory,
        memoryPercent: totalMemory ? (usedMemory / totalMemory) * 100 : 0,
        totalDisk,
        usedDisk,
        diskPercent: totalDisk ? (usedDisk / totalDisk) * 100 : 0,
        totalCpu,
        allocatedCpu,
        cpuPercent: totalCpu ? (allocatedCpu / totalCpu) * 100 : 0,
        totalServers: nodeServers.length,
        onlineServers,
        statusKnown,
    };
}

export function evaluateAlerts(stats, thresholds) {
    const alerts = [];
    if (stats.cpuPercent >= thresholds.cpu) alerts.push("CPU usage high");
    if (stats.memoryPercent >= thresholds.memory) alerts.push("Memory usage high");
    if (stats.diskPercent >= thresholds.disk) alerts.push("Disk usage high");
    return alerts;
}

export function formatPercent(value, digits = 1) {
    if (!Number.isFinite(value)) return "N/A";
    return `${value.toFixed(digits)}%`;
}

export function formatMegabytes(mb) {
    const value = Number(mb) || 0;
    if (value <= 0) return "0 MB";
    if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
    return `${value} MB`;
}
