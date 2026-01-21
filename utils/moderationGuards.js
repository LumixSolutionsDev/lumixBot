import { PermissionFlagsBits } from "discord.js";

export async function getMe(guild) {
    return guild.members.me ?? guild.members.fetchMe();
}

export function requireGuild(interaction) {
    if (!interaction.guild) {
        return { ok: false, message: "This command can only be used in a server." };
    }
    return { ok: true };
}

export function requireMember(interaction) {
    const member = interaction.member;
    if (!member || !("permissions" in member)) {
        return { ok: false, message: "Could not resolve your server permissions." };
    }
    return { ok: true, member };
}

export function requirePerms(interactionMember, requiredPerm) {
    if (!interactionMember.permissions.has(requiredPerm)) {
        return { ok: false, message: "You don’t have permission to use this command." };
    }
    return { ok: true };
}

export async function ensureCanActOnTarget({ guild, actorMember, targetMember }) {
    // Prevent self-action
    if (actorMember.id === targetMember.id) {
        return { ok: false, message: "You can’t perform that action on yourself." };
    }

    // Allow guild owner to bypass hierarchy checks
    if (actorMember.id === guild.ownerId) {
        return { ok: true };
    }

    // Prevent acting on owner
    if (targetMember.id === guild.ownerId) {
        return { ok: false, message: "You can’t perform that action on the server owner." };
    }

    const actorTop = actorMember.roles?.highest;
    const targetTop = targetMember.roles?.highest;

    if (actorTop && targetTop && targetTop.position >= actorTop.position) {
        return { ok: false, message: "You can’t perform that action on someone with an equal/higher role." };
    }

    const me = await getMe(guild);
    const meTop = me.roles?.highest;
    if (meTop && targetTop && targetTop.position >= meTop.position) {
        return { ok: false, message: "I can’t perform that action due to role hierarchy." };
    }

    return { ok: true };
}

export function normalizeReason(reason, interactionUser) {
    const clean = reason && String(reason).trim() ? String(reason).trim() : "No reason provided.";
    // Provide traceability in audit log
    return `${clean} (by ${interactionUser.tag})`;
}

export const PERMS = {
    warn: PermissionFlagsBits.ModerateMembers,
    timeout: PermissionFlagsBits.ModerateMembers,
    untimeout: PermissionFlagsBits.ModerateMembers,
    kick: PermissionFlagsBits.KickMembers,
    ban: PermissionFlagsBits.BanMembers,
    unban: PermissionFlagsBits.BanMembers,
    purge: PermissionFlagsBits.ManageMessages,
};
