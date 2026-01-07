import { PrismaClient, Punishment } from "@prisma/client";
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

export default class PunishmentRepository {
    constructor() {
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getPunishment(whatsAppMemberId: string): Promise<Punishment | null> {
        return getPrismaClient().punishment.findFirst({
            where: { whatsAppMemberId, isActive: true }
        });
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
        return getPrismaClient().punishment.create({
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
    }

    async updatePunishment(punishment: Punishment): Promise<Punishment> {
        return getPrismaClient().punishment.update({
            where: { id: punishment.id },
            data: punishment
        });
    }

    async deactivatePunishment(whatsAppMemberId: string): Promise<void> {
        await getPrismaClient().punishment.updateMany({
            where: { whatsAppMemberId, isActive: true },
            data: { isActive: false }
        });
    }
}