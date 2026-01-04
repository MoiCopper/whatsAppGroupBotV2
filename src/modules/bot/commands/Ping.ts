import eventBus from "../../../eventBus";
import { CommandExecutedPayload, DomainEvent, DomainEventType, SendMessagePayload } from "../../../shared/types/domainEvents";

export class PingCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({payload}: DomainEvent<CommandExecutedPayload>) => {
            console.log('[PingCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if(payload.command === '/ping'){
                console.log('[PingCommand] Processando comando /ping');
                await this.execute(payload);
            }
        });
    }

    async execute({message}: CommandExecutedPayload): Promise<void> {
        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: message.from,
                text: 'BOT: Pong',
                message: message
            }
        });
    }
}