import { Message } from "whatsapp-web.js";
import eventBus from "../../eventBus";
import { DomainEventType, MemberMessageSentPayload, DomainEvent, CommandExecutedPayload, SendMessagePayload } from "../../shared/types/domainEvents";
import { punishmentRepository } from "../../shared/storage";

export class CdmCommandHandler {
    private validComands: string[] = ['/timeout', '/setFree', '/registerGroup', '/ping'];
    constructor() {
        console.log('[CdmCommandHandler] Registrando listener para MEMBER_MESSAGE_SENT');
        eventBus.onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT).subscribe(async ({ payload }: DomainEvent<MemberMessageSentPayload>) => {
            console.log('[CdmCommandHandler] Evento MEMBER_MESSAGE_SENT recebido');
            if (this.isCommand(payload.message)) {
                await this.handleCommand(payload);
            }
        });
    }

    private isCommand(msg: Message): boolean {
        const isCommand = msg.body.startsWith('/');

        if (!isCommand) {
            return false;
        }

        const command = msg.body.split(' ')[0];
        const isValidCommand = this.validComands.includes(command);

        if (isValidCommand) {
            return true;
        }

        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: msg.from,
                text: `BOT: Oh meu amor, usa o bot direito, por favor! \n\n os comandos validos sao: \n${this.validComands.join('\n')}`,
                message: msg
            }
        });

        return false;
    }

    private async handleCommand({ message, chat, targetId, targetName, memberId, targetAuthorId }: MemberMessageSentPayload): Promise<void> {
        const command = message.body.split(' ')[0];
        const punishment = await punishmentRepository.getPunishment(memberId);

        if (punishment) {
            return;
        }

        console.log('[CdmCommandHandler] Emitindo COMMAND_EXECUTED para comando:', command);
        eventBus.emit<CommandExecutedPayload>({
            type: DomainEventType.COMMAND_EXECUTED,
            payload: {
                command: command,
                message: message,
                chat: chat,
                targetId: targetId,
                targetName: targetName,
                targetAuthorId: targetAuthorId ?? ''
            }
        });
    }
}