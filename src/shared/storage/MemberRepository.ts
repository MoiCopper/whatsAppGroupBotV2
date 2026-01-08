import { Member, PrismaClient } from "@prisma/client";
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

export default class MemberRepository {
    private cache: Cache<Member>;

    constructor() {
        this.cache = new Cache<Member>();
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getMember(whatsAppMemberId: string): Promise<Member | null> {
        const cacheKey = CACHE_KEYS.MEMBER(whatsAppMemberId);

        // Tenta obter do cache primeiro
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não estiver no cache, busca no banco
        const member = await getPrismaClient().member.findUnique({
            where: { whatsAppMemberId }
        });

        // Armazena no cache se encontrado
        if (member) {
            this.cache.set({
                key: cacheKey,
                value: member,
                ttlMs: CACHE_TTL.MEMBER
            });
        }

        return member;
    }

    async createMember(member: { whatsAppMemberId: string; name: string; authorId?: string }): Promise<Member> {
        const created = await getPrismaClient().member.create({
            data: {
                whatsAppMemberId: member.whatsAppMemberId,
                name: member.name,
                authorId: member.authorId || member.whatsAppMemberId
            }
        });

        // Armazena no cache após criar
        this.cache.set({
            key: CACHE_KEYS.MEMBER(created.whatsAppMemberId),
            value: created,
            ttlMs: CACHE_TTL.MEMBER
        });

        return created;
    }

    async updateMember(id: string, data: { name?: string }): Promise<Member> {
        // Busca o membro antes de atualizar para invalidar o cache
        const memberBefore = await getPrismaClient().member.findUnique({
            where: { id }
        });

        const updated = await getPrismaClient().member.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name })
            }
        });

        // Atualiza cache após atualizar
        if (memberBefore) {
            this.cache.set({
                key: CACHE_KEYS.MEMBER(memberBefore.whatsAppMemberId),
                value: updated,
                ttlMs: CACHE_TTL.MEMBER
            });
        }

        return updated;
    }

    async deleteMember(id: string): Promise<void> {
        // Busca o membro antes de deletar para invalidar o cache
        const member = await getPrismaClient().member.findUnique({
            where: { id }
        });

        await getPrismaClient().member.delete({
            where: { id }
        });

        // Remove do cache após deletar
        if (member) {
            this.cache.delete(CACHE_KEYS.MEMBER(member.whatsAppMemberId));
        }
    }
}