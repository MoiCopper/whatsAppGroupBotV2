import { GroupChat, Message } from "whatsapp-web.js";
import eventBus from "../../../eventBus";
import { CommandExecutedPayload, DomainEventType, DomainEvent, SendMessagePayload } from "../../../shared/types/domainEvents";
import { punishmentRepository } from "../../../shared/storage";

export class SetFreeCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[SetFreeCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command.toLowerCase() === '/setfree') {
                console.log('[SetFreeCommand] Processando comando /setfree');
                await this.execute(payload);
            }
        });
    }

    async execute({ message, chat, targetId, targetName }: CommandExecutedPayload): Promise<void> {
        try {
            if (!targetId || !targetName) {
                eventBus.emit<SendMessagePayload>({
                    type: DomainEventType.SEND_MESSAGE,
                    payload: {
                        chatId: message.from,
                        text: 'BOT: Não foi possível identificar o mamador alvo'
                    }
                });
                return;
            }
            await this.setFreeUser({ message, chat, targetId, targetName });
        } catch (error) {
            console.error(error as Error, 'SetFreeCommand.execute');
            throw error;
        }
    }

    async setFreeUser({ message, chat, targetId, targetName }: { message: Message, chat: GroupChat, targetId: string, targetName: string }): Promise<void> {
        await punishmentRepository.deactivatePunishment(targetId);

        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: message.from,
                text: `BOT: ${targetName.toUpperCase()} parou de mamar`,
                message: message
            }
        });
    }
}