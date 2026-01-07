import { ChatGroups, Group, PrismaClient } from "@prisma/client";
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

export default class ChatGroupRepository {
    constructor() {
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getChatGroup(groupId: string, memberId: string): Promise<ChatGroups | null> {
        return getPrismaClient().chatGroups.findFirst({
            where: { groupId, memberId }
        });
    }

    async getOrCreateChatGroup(groupId: string, memberId: string): Promise<ChatGroups> {
        const existing = await this.getChatGroup(groupId, memberId);
        if (existing) {
            return existing;
        }

        // Cria um novo ChatGroups se não existir
        return getPrismaClient().chatGroups.create({
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
    }

    async createChatGroup(chatGroup: { groupId: string; memberId: string; isAdmin?: boolean; numberOfMessages?: number }): Promise<ChatGroups> {
        return getPrismaClient().chatGroups.create({
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
    }

    async updateChatGroup(chatGroup: ChatGroups): Promise<ChatGroups> {
        return getPrismaClient().chatGroups.update({
            where: { id: chatGroup.id },
            data: chatGroup
        });
    }

    async deleteChatGroup(id: string): Promise<void> {
        await getPrismaClient().chatGroups.delete({
            where: { id }
        });
    }
}