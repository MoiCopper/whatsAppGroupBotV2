import { Blacklist, PrismaClient } from "@prisma/client";
import eventBus from "../../eventBus";
import { DatabaseConnectedPayload, DomainEvent, DomainEventType } from "../types/domainEvents";
import Cache from "../utils/Cache";
import { CACHE_TTL, CACHE_KEYS } from "./CacheConfig";

// PrismaClient será inicializado no initDb.ts para garantir que DATABASE_URL esteja disponível
let prisma: PrismaClient;

export function setPrismaClient(client: PrismaClient) {
    prisma = client;
}

export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        throw new Error('PrismaClient não foi inicializado. Chame initDb() primeiro.');
    }
    return prisma;
}

export default class BlacklistRepository {
    private cache: Cache<Blacklist>;

    constructor() {
        this.cache = new Cache<Blacklist>();
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getBlacklistEntry(memberId: string): Promise<Blacklist | null> {
        const cacheKey = CACHE_KEYS.BLACKLIST(memberId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não estiver no cache, busca no banco
        const blacklistEntry = await getPrismaClient().blacklist.findUnique({
            where: { memberId }
        });

        // Armazena no cache se encontrado
        if (blacklistEntry) {
            this.cache.set({
                key: cacheKey,
                value: blacklistEntry,
                ttlMs: CACHE_TTL.BLACKLIST
            });
        }

        return blacklistEntry;
    }

    async isBlacklisted(whatsAppMemberId: string): Promise<boolean> {
        // Primeiro busca o Member pelo whatsAppMemberId
        const member = await getPrismaClient().member.findUnique({
            where: { whatsAppMemberId }
        });

        if (!member) {
            return false;
        }

        // Verifica se está na blacklist
        const blacklistEntry = await this.getBlacklistEntry(member.id);
        return blacklistEntry !== null;
    }

    async addToBlacklist(data: {
        memberId: string;
        reason: string;
        bannedBy?: string;
        bannedFromGroupId?: string;
        notes?: string;
    }): Promise<Blacklist> {
        const created = await getPrismaClient().blacklist.create({
            data: {
                memberId: data.memberId,
                reason: data.reason,
                bannedBy: data.bannedBy,
                bannedFromGroupId: data.bannedFromGroupId,
                notes: data.notes
            }
        });

        // Armazena no cache após criar
        this.cache.set({
            key: CACHE_KEYS.BLACKLIST(created.memberId),
            value: created,
            ttlMs: CACHE_TTL.BLACKLIST
        });

        return created;
    }

    async removeFromBlacklist(memberId: string): Promise<void> {
        // Busca a entrada antes de deletar para invalidar o cache
        const blacklistEntry = await getPrismaClient().blacklist.findUnique({
            where: { memberId }
        });

        await getPrismaClient().blacklist.delete({
            where: { memberId }
        });

        // Remove do cache após deletar
        if (blacklistEntry) {
            this.cache.delete(CACHE_KEYS.BLACKLIST(blacklistEntry.memberId));
        }
    }

    async updateBlacklistEntry(blacklist: Blacklist): Promise<Blacklist> {
        const updated = await getPrismaClient().blacklist.update({
            where: { id: blacklist.id },
            data: blacklist
        });

        // Atualiza cache após atualizar
        this.cache.set({
            key: CACHE_KEYS.BLACKLIST(updated.memberId),
            value: updated,
            ttlMs: CACHE_TTL.BLACKLIST
        });

        return updated;
    }
}

