import { DomainEvent, DomainEventType, CommandExecutedPayload, SendMessagePayload } from "../../../shared/types/domainEvents";
import eventBus from "../../../eventBus";
import { GroupChat, Message } from "whatsapp-web.js";
import { groupRepository } from "../../../shared/storage";

export class RegisterGroupCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[RegisterGroupCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command.toLowerCase() === '/registergroup') {
                await this.execute(payload);
            }
        });
    }

    async execute({ message, chat }: CommandExecutedPayload): Promise<void> {
        try {
            await this.registerGroup(message, chat);
        } catch (error) {
            console.error('[RegisterGroupCommand] Erro ao executar comando:', error);
            throw error;
        }
    }

    async registerGroup(msg: Message, chat: GroupChat) {
        const groupId = chat.id._serialized;
        const groupName = chat.name;

        if (!groupId) {
            console.error('[RegisterGroupCommand] groupId é undefined ou null');
            throw new Error('ID do grupo não encontrado');
        }

        if (!groupName) {
            console.error('[RegisterGroupCommand] groupName é undefined ou null');
            throw new Error('Nome do grupo não encontrado');
        }

        const isGroupRegistered = await groupRepository.getGroup(groupId);
        if (isGroupRegistered) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: msg.from,
                    text: `BOT: Grupo ${groupName} já está registrado meu amooor 😍🤖`,
                    message: msg
                }
            });
            return;
        }

        const groupDescription = chat.description || null;

        console.log('[RegisterGroupCommand] Criando grupo:', { whatsAppGroupId: groupId, name: groupName, description: groupDescription });

        const group = await groupRepository.createGroup({
            whatsAppGroupId: groupId,
            name: groupName,
            description: groupDescription
        });

        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: msg.from,
                text: `BOT: Grupo ${groupName} registrado com sucesso`,
                message: msg
            }
        });

        return group;
    }
}