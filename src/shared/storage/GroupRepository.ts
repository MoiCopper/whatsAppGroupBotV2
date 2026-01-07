import { Group, PrismaClient } from "@prisma/client";
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

export default class GroupRepository {
    private cache: Cache<Group>;

    constructor() {
        this.cache = new Cache<Group>();
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getGroup(whatsAppGroupId: string): Promise<Group | null> {
        const cacheKey = CACHE_KEYS.GROUP(whatsAppGroupId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não estiver no cache, busca no banco
        const group = await getPrismaClient().group.findFirst({
            where: { whatsAppGroupId }
        });

        // Armazena no cache se encontrado
        if (group) {
            this.cache.set({
                key: cacheKey,
                value: group,
                ttlMs: CACHE_TTL.GROUP
            });
        }

        return group;
    }

    async createGroup(group: { whatsAppGroupId: string; name: string; description?: string | null }): Promise<Group> {
        if (!group.whatsAppGroupId || group.whatsAppGroupId.trim() === '') {
            throw new Error('whatsAppGroupId é obrigatório e não pode ser vazio');
        }

        if (!group.name || group.name.trim() === '') {
            throw new Error('name é obrigatório e não pode ser vazio');
        }

        // Sempre passa description como string (vazia se não fornecida)
        // Isso garante compatibilidade com o schema que tem @default("")
        const data = {
            whatsAppGroupId: group.whatsAppGroupId.trim(),
            name: group.name.trim(),
            description: (group.description || '').trim()
        };

        console.log('[GroupRepository] Criando grupo com dados:', data);

        const created = await getPrismaClient().group.create({
            data
        });

        // Invalida cache após criar
        this.cache.set({
            key: CACHE_KEYS.GROUP(created.whatsAppGroupId),
            value: created,
            ttlMs: CACHE_TTL.GROUP
        });

        return created;
    }

    async updateGroup(id: string, data: { name?: string; description?: string | null }): Promise<Group> {
        const updated = await getPrismaClient().group.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description ?? '' })
            }
        });

        // Atualiza cache após atualizar
        this.cache.set({
            key: CACHE_KEYS.GROUP(updated.whatsAppGroupId),
            value: updated,
            ttlMs: CACHE_TTL.GROUP
        });

        return updated;
    }

    async deleteGroup(id: string): Promise<void> {
        // Busca o grupo antes de deletar para invalidar o cache
        const group = await getPrismaClient().group.findUnique({
            where: { id }
        });

        await getPrismaClient().group.delete({
            where: { id }
        });

        // Remove do cache após deletar
        if (group) {
            this.cache.delete(CACHE_KEYS.GROUP(group.whatsAppGroupId));
        }
    }
}