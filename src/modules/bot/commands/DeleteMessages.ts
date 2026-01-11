import { DomainEvent, DomainEventType, CommandExecutedPayload, SendMessagePayload } from "../../../shared/types/domainEvents";
import eventBus from "../../../eventBus";
import { GroupChat, Message } from "whatsapp-web.js";
import { extractLimitArgument } from "../../../shared/utils/extractLimitArgument";
import { safeDeleteMessage } from "../../../shared/utils/safeMessageDelete";

export class DeleteMessagesCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[DeleteMessagesCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command.toLowerCase() === '/deletemessages') {
                console.log('[DeleteMessagesCommand] Processando comando /deleteMessages');
                await this.execute(payload);
            }
        });
    }

    async execute(props: CommandExecutedPayload): Promise<void> {
        if (!props.targetId || !props.targetName) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: props.message.from,
                    text: 'BOT: Não foi possível identificar o usuário alvo'
                }
            });
            return;
        }
        try {
            await this.deleteUserMessages({
                message: props.message,
                chat: props.chat,
                targetName: props.targetName,
                targetId: props.targetId,
                targetAuthorId: props.targetAuthorId
            });
        } catch (error) {
            console.error(error as Error, 'DeleteMessagesCommand.execute');
            throw error;
        }
    }

    async deleteUserMessages({ message, targetName, targetId, targetAuthorId }: { message: Message, chat: GroupChat, targetName: string, targetId: string, targetAuthorId: string }): Promise<void> {
        // Extrair o limite do comando (padrão: 100)
        const chat = await message.getChat();
        const limitArg = extractLimitArgument(message.body);
        const limit = limitArg ?? 100;

        try {
            // Buscar mensagens do chat usando fetchMessages
            const messages = await chat.fetchMessages({ limit });

            // Filtrar mensagens do usuário alvo
            const userMessages = messages.filter(msg => {
                const messageAuthorId = msg.author;
                return messageAuthorId === targetAuthorId;
            });

            if (userMessages.length === 0) {
                eventBus.emit<SendMessagePayload>({
                    type: DomainEventType.SEND_MESSAGE,
                    payload: {
                        chatId: message.from,
                        text: `BOT: Nenhuma mensagem de ${targetName} encontrada nas últimas ${limit} mensagens`,
                        message: message
                    }
                });
                return;
            }

            // Deletar as mensagens encontradas
            let deletedCount = 0;
            let failedCount = 0;

            const replyMessage = await message.reply(`BOT: Estou deletando ${deletedCount}/${userMessages.length} mensagens de ${targetName}`);

            // Processar mensagens com controle de concorrência (máximo 3 simultâneas)
            const concurrencyLimit = 3;
            const processMessage = async (msg: Message, index: number) => {
                try {
                    const deleted = await safeDeleteMessage(msg, true, 3);
                    if (deleted) {
                        deletedCount++;
                        replyMessage.edit(`BOT: Estou deletando ${deletedCount}/${userMessages.length} mensagens de ${targetName}`);
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    console.error(`[DeleteMessagesCommand] Erro ao deletar mensagem ${msg.id._serialized}:`, error);
                    failedCount++;
                }
            };

            // Processar em batches com concorrência controlada
            for (let i = 0; i < userMessages.length; i += concurrencyLimit) {
                const batch = userMessages.slice(i, i + concurrencyLimit);
                await Promise.allSettled(batch.map((msg, batchIndex) => processMessage(msg, i + batchIndex)));

                // Pequeno delay entre batches para evitar rate limiting
                if (i + concurrencyLimit < userMessages.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            // Enviar mensagem de confirmação
            let responseText = `BOT: Deletadas ${deletedCount} mensage${deletedCount !== 1 ? 'ns' : 'm'} de ${targetName}`;
            if (failedCount > 0) {
                responseText += `\n⚠️ ${failedCount} mensagem${failedCount !== 1 ? 's' : ''} não puderam ser deletadas`;
            }

            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: responseText,
                    message: message
                }
            });
            safeDeleteMessage(replyMessage, true, 3);

        } catch (error) {
            console.error('[DeleteMessagesCommand] Erro ao buscar/deletar mensagens:', error);
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: `BOT: Erro ao processar comando /deleteMessages`,
                    message: message
                }
            });
        }
    }
}

