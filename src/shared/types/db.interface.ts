import { Prisma } from '@prisma/client';

// Tipos base do Prisma
export type PunishmentType = 'timeout' | 'mute' | 'ban' | 'permanentBan' | 'kick' | 'warn';

// Interface para Group (baseado no Prisma)
export interface Group {
    id: string; // UUID do Prisma
    whatsAppGroupId: string; // ID do grupo no WhatsApp
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    // Relações opcionais (quando incluídas)
    groupMembers?: ChatGroups[];
}

// Interface para Member (baseado no Prisma)
export interface Member {
    id: string; // UUID do Prisma
    authorId: string; // ID do autor do membro
    whatsAppMemberId: string; // ID do membro no WhatsApp
    name: string;
    createdAt: Date;
    updatedAt: Date;
    // Relações opcionais (quando incluídas)
    groups?: ChatGroups[];
    blacklist?: Blacklist | null;
    punishments?: Punishment[];
}

// Interface para ChatGroups (relação many-to-many)
export interface ChatGroups {
    id: string; // UUID do Prisma
    groupId: string;
    memberId: string;
    isAdmin: boolean;
    numberOfMessages: number;
    // Contadores de punições
    timeoutCount: number;
    muteCount: number;
    banCount: number;
    permanentBanCount: number;
    kickCount: number;
    warnCount: number;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    // Relações opcionais (quando incluídas)
    group?: Group;
    member?: Member;
    punishments?: Punishment[];
}

// Interface para Punishment (histórico de punições)
export interface Punishment {
    id: string; // UUID do Prisma
    memberId: string; // Relação direta com Member
    chatGroupId: string; // Contexto: em qual grupo foi aplicada
    groupId: string; // ID do grupo (para facilitar queries)
    type: PunishmentType;
    duration: number; // Duração em milissegundos
    reason: string;
    appliedAt: Date;
    expiresAt: Date | null; // Null para punições permanentes
    isActive: boolean; // Se é a punição atual ativa
    createdAt: Date;
    // Relações opcionais (quando incluídas)
    member?: Member;
    chatGroup?: ChatGroups;
}

// Interface para Blacklist
export interface Blacklist {
    id: string; // UUID do Prisma
    memberId: string;
    reason: string;
    bannedBy: string | null;
    bannedFromGroupId: string | null;
    notes: string | null;
    createdAt: Date;
    // Relações opcionais (quando incluídas)
    member?: Member;
}

// Interface para criar uma punição (mantida para compatibilidade)
export interface CreateAPunishmentParams {
    groupId: string; // postgres id
    chatGroupId: string; // whatsAppGroupId
    memberId: string; // whatsAppMemberId
    type: 'timeout' | 'mute' | 'ban' | 'kick' | 'warn'; // Tipos compatíveis (sem permanentBan aqui)
    duration: number;
    reason: string;
    expiresAt: Date;
}

// Tipos auxiliares para queries com includes
export type GroupWithMembers = Prisma.GroupGetPayload<{
    include: {
        groupMembers: {
            include: {
                member: true;
                punishments: {
                    where: { isActive: true };
                };
            };
        };
    };
}>;

export type ChatGroupsWithRelations = Prisma.ChatGroupsGetPayload<{
    include: {
        member: true;
        group: true;
        punishments: true;
    };
}>;

export type MemberWithGroups = Prisma.MemberGetPayload<{
    include: {
        groups: {
            include: {
                group: true;
                punishments: {
                    where: { isActive: true };
                };
            };
        };
    };
}>;

// Interface legada mantida para compatibilidade (deprecated)
/** @deprecated Use Group com groupMembers ao invés disso */
export interface LegacyGroup {
    id: string;
    name: string;
    description: string;
    members: { [key: string]: LegacyMember };
}

/** @deprecated Use ChatGroups ao invés disso */
export interface LegacyMember {
    id: string;
    name: string;
    isAdmin: boolean;
    punishments: {
        timeout: number;
        mute: number;
        ban: number;
        kick: number;
        warn: number;
        note: string;
    };
    currentPunishment?: CurrentPunishment;
    menssagesIds: string[];
    numberOfMessages: number;
}

/** @deprecated Use Punishment ao invés disso */
export interface CurrentPunishment {
    type: 'timeout' | 'mute' | 'ban' | 'kick' | 'warn';
    duration: number;
    reason: string;
    appliedAt: Date;
    expiresAt: Date | null;
}

/** @deprecated Não é mais necessário */
export interface DB {
    groups: { [key: string]: LegacyGroup };
}
