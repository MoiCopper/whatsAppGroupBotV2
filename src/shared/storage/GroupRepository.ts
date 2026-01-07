import { Group, PrismaClient } from "@prisma/client";
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

export default class GroupRepository {
    constructor() {
        eventBus.onEvent(DomainEventType.DATABASE_CONNECTED).subscribe(async ({ payload }: DomainEvent<DatabaseConnectedPayload>) => {
            setPrismaClient(payload.prismaClient);
        });
    }

    async getGroup(whatsAppGroupId: string): Promise<Group | null> {
        return getPrismaClient().group.findFirst({
            where: { whatsAppGroupId }
        });
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

        return getPrismaClient().group.create({
            data
        });
    }

    async updateGroup(id: string, data: { name?: string; description?: string | null }): Promise<Group> {
        return getPrismaClient().group.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description ?? '' })
            }
        });
    }

    async deleteGroup(id: string): Promise<void> {
        await getPrismaClient().group.delete({
            where: { id }
        });
    }
}