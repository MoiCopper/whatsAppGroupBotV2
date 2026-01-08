import { PrismaClient, Punishment } from "@prisma/client";
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

export default class PunishmentRepository {
    private cache: Cache<Punishment>;

    constructor() {
        this.cache = new Cache<Punishment>();
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getPunishment(whatsAppMemberId: string): Promise<Punishment | null> {
        const cacheKey = CACHE_KEYS.PUNISHMENT(whatsAppMemberId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não estiver no cache, busca no banco
        const punishment = await getPrismaClient().punishment.findFirst({
            where: { whatsAppMemberId, isActive: true }
        });

        // Armazena no cache se encontrado
        if (punishment) {
            this.cache.set({
                key: cacheKey,
                value: punishment,
                ttlMs: CACHE_TTL.PUNISHMENT
            });
        }

        return punishment;
    }

    async createPunishment(punishment: {
        memberId: string;
        chatGroupId: string;
        groupId: string;
        type: 'timeout' | 'mute' | 'ban' | 'permanentBan' | 'kick' | 'warn';
        duration: number;
        reason: string;
        expiresAt?: Date | null;
        isActive?: boolean;
        whatsAppGroupId: string;
        whatsAppMemberId: string;
    }): Promise<Punishment> {
        const created = await getPrismaClient().punishment.create({
            data: {
                memberId: punishment.memberId,
                chatGroupId: punishment.chatGroupId,
                groupId: punishment.groupId,
                type: punishment.type,
                duration: punishment.duration,
                reason: punishment.reason,
                expiresAt: punishment.expiresAt,
                isActive: punishment.isActive ?? true,
                whatsAppGroupId: punishment.whatsAppGroupId,
                whatsAppMemberId: punishment.whatsAppMemberId
            }
        });

        // Invalida cache após criar (remove cache antigo se existir)
        this.cache.delete(CACHE_KEYS.PUNISHMENT(punishment.whatsAppMemberId));

        // Se a punição está ativa, armazena no cache
        if (created.isActive) {
            this.cache.set({
                key: CACHE_KEYS.PUNISHMENT(punishment.whatsAppMemberId),
                value: created,
                ttlMs: CACHE_TTL.PUNISHMENT
            });
        }

        return created;
    }

    async updatePunishment(punishment: Punishment): Promise<Punishment> {
        const updated = await getPrismaClient().punishment.update({
            where: { id: punishment.id },
            data: punishment
        });

        // Atualiza cache se a punição estiver ativa
        if (updated.isActive && updated.whatsAppMemberId) {
            this.cache.set({
                key: CACHE_KEYS.PUNISHMENT(updated.whatsAppMemberId),
                value: updated,
                ttlMs: CACHE_TTL.PUNISHMENT
            });
        } else if (updated.whatsAppMemberId) {
            // Remove do cache se não estiver mais ativa
            this.cache.delete(CACHE_KEYS.PUNISHMENT(updated.whatsAppMemberId));
        }

        return updated;
    }

    async deactivatePunishment(whatsAppMemberId: string): Promise<void> {
        await getPrismaClient().punishment.updateMany({
            where: { whatsAppMemberId, isActive: true },
            data: { isActive: false }
        });

        // Remove do cache após desativar
        this.cache.delete(CACHE_KEYS.PUNISHMENT(whatsAppMemberId));
    }
}