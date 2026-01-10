import eventBus from "../../../eventBus";
import { groupRepository } from "../../../shared/storage";
import { CommandExecutedPayload, DomainEvent, DomainEventType, SendMessagePayload } from "../../../shared/types/domainEvents";

export class AllCommands {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[AllCommands] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command.toLowerCase() === '/all') {
                console.log('[AllCommands] Processando comando /all');
                await this.execute(payload);
            }
        });
    }

    async execute({ message, chat }: CommandExecutedPayload): Promise<void> {
        //get all members from group
        const group = await groupRepository.getGroup(chat.id._serialized);

        if (!group) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: 'Grupo não encontrado',
                    message: message
                }
            });
            return;
        }

        const participants = chat.participants;
        const membersIds = participants.map(participant => participant.id._serialized);
        const messageText = message.body.replace('/all', '');

        const payload: SendMessagePayload = {
            chatId: message.from,
            text: messageText,
            mentions: membersIds,
            editMessage: messageText.includes('/edit'),
            message: message
        }

        //TODO reenviar mensagem e deletar a antiga
        // if (messageText.includes('/delete')) {
        //     safeDeleteMessage(message, true);
        //     delete payload.message;
        // } else {
        //     payload.text = '';
        //     if (message.hasQuotedMsg) {
        //         const quotedMessage = await message.getQuotedMessage();
        //         payload.message = quotedMessage;
        //     }
        // }


        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: payload
        })

    }
}