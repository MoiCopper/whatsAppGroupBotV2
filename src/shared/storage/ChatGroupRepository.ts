import { ChatGroups, Group, PrismaClient } from "@prisma/client";
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

export default class ChatGroupRepository {
    private cache: Cache<ChatGroups>;

    constructor() {
        this.cache = new Cache<ChatGroups>();
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getChatGroup(groupId: string, memberId: string): Promise<ChatGroups | null> {
        const cacheKey = CACHE_KEYS.CHAT_GROUP(groupId, memberId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não estiver no cache, busca no banco
        const chatGroup = await getPrismaClient().chatGroups.findFirst({
            where: { groupId, memberId }
        });

        // Armazena no cache se encontrado
        if (chatGroup) {
            this.cache.set({
                key: cacheKey,
                value: chatGroup,
                ttlMs: CACHE_TTL.CHAT_GROUP
            });
        }

        return chatGroup;
    }

    async getOrCreateChatGroup(groupId: string, memberId: string): Promise<ChatGroups> {
        const cacheKey = CACHE_KEYS.CHAT_GROUP(groupId, memberId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Tenta buscar no banco
        const existing = await this.getChatGroup(groupId, memberId);
        if (existing) {
            return existing;
        }

        // Cria um novo ChatGroups se não existir
        const created = await getPrismaClient().chatGroups.create({
            data: {
                groupId,
                memberId,
                isAdmin: false,
                numberOfMessages: 0,
                timeoutCount: 0,
                muteCount: 0,
                banCount: 0,
                permanentBanCount: 0,
                kickCount: 0,
                warnCount: 0,
                note: ''
            }
        });

        // Armazena no cache após criar
        this.cache.set({
            key: cacheKey,
            value: created,
            ttlMs: CACHE_TTL.CHAT_GROUP
        });

        return created;
    }

    async createChatGroup(chatGroup: { groupId: string; memberId: string; isAdmin?: boolean; numberOfMessages?: number }): Promise<ChatGroups> {
        const created = await getPrismaClient().chatGroups.create({
            data: {
                groupId: chatGroup.groupId,
                memberId: chatGroup.memberId,
                isAdmin: chatGroup.isAdmin ?? false,
                numberOfMessages: chatGroup.numberOfMessages ?? 0,
                timeoutCount: 0,
                muteCount: 0,
                banCount: 0,
                permanentBanCount: 0,
                kickCount: 0,
                warnCount: 0,
                note: ''
            }
        });

        // Armazena no cache após criar
        this.cache.set({
            key: CACHE_KEYS.CHAT_GROUP(created.groupId, created.memberId),
            value: created,
            ttlMs: CACHE_TTL.CHAT_GROUP
        });

        return created;
    }

    async updateChatGroup(chatGroup: ChatGroups): Promise<ChatGroups> {
        const updated = await getPrismaClient().chatGroups.update({
            where: { id: chatGroup.id },
            data: chatGroup
        });

        // Atualiza cache após atualizar
        this.cache.set({
            key: CACHE_KEYS.CHAT_GROUP(updated.groupId, updated.memberId),
            value: updated,
            ttlMs: CACHE_TTL.CHAT_GROUP
        });

        return updated;
    }

    async deleteChatGroup(id: string): Promise<void> {
        // Busca o ChatGroup antes de deletar para invalidar o cache
        const chatGroup = await getPrismaClient().chatGroups.findUnique({
            where: { id }
        });

        await getPrismaClient().chatGroups.delete({
            where: { id }
        });

        // Remove do cache após deletar
        if (chatGroup) {
            this.cache.delete(CACHE_KEYS.CHAT_GROUP(chatGroup.groupId, chatGroup.memberId));
        }
    }
}