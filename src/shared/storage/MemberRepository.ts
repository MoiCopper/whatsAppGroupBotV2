import { Member, PrismaClient } from "@prisma/client";
import eventBus from "../../eventBus";
import { DatabaseConnectedPayload, DomainEvent, DomainEventType } from "../types/domainEvents";

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
    constructor() {
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getMember(whatsAppMemberId: string): Promise<Member | null> {
        return getPrismaClient().member.findUnique({
            where: { whatsAppMemberId }
        });
    }

    async createMember(member: { whatsAppMemberId: string; name: string; authorId?: string }): Promise<Member> {
        return getPrismaClient().member.create({
            data: {
                whatsAppMemberId: member.whatsAppMemberId,
                name: member.name,
                authorId: member.authorId || member.whatsAppMemberId
            }
        });
    }

    async updateMember(id: string, data: { name?: string }): Promise<Member> {
        return getPrismaClient().member.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name })
            }
        });
    }

    async deleteMember(id: string): Promise<void> {
        await getPrismaClient().member.delete({
            where: { id }
        });
    }
}