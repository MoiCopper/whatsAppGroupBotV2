import { Client, Message } from "whatsapp-web.js";
import eventBus from "../../eventBus";
import { DomainEvent, DomainEventType, SendMessagePayload } from "../../shared/types/domainEvents";
import { debounceTime, distinctUntilChanged } from "rxjs";

export class WhatsAppMessageSender {
    private client: Client;
    constructor(client: Client) {
        this.client = client;
        eventBus.onEvent(DomainEventType.SEND_MESSAGE).pipe(distinctUntilChanged((prev, curr) => prev.payload.text === curr.payload.text)).pipe(debounceTime(300)).subscribe(async ({ payload }: DomainEvent<SendMessagePayload>) => {
            if (payload.editMessage) {
                await this.editMessage({ message: payload.message as Message, text: payload.text, mentions: payload.mentions });
                return;
            }

            if (payload.message) {
                await this.replyMessage({ message: payload.message, text: payload.text, mentions: payload.mentions });
                return;
            }
            await this.sendMessage({ chatId: payload.chatId, text: payload.text, mentions: payload.mentions });
        });
    }

    private formatMessageWithMentions(text: string, mentions?: string[]): string {
        if (mentions && mentions.length > 0) {
            return `${text}\n\n${mentions.map(mention => `@${mention.split('@')[0]}`).join(' ')}`;
        }
        return text;
    }

    async sendMessage({ chatId, text, mentions }: { chatId: string, text: string, mentions?: string[] }): Promise<void> {
        const messageText = this.formatMessageWithMentions(text, mentions);
        if (mentions && mentions.length > 0) {
            await this.client.sendMessage(chatId, messageText, { mentions });
        } else {
            await this.client.sendMessage(chatId, messageText);
        }
    }

    async replyMessage({ message, text, mentions }: { message: Message, text: string, mentions?: string[] }): Promise<void> {
        try {
            const messageText = this.formatMessageWithMentions(text, mentions);
            if (mentions && mentions.length > 0) {
                await message.reply(messageText, undefined, { mentions });
            } else {
                await message.reply(messageText);
            }
        } catch (error: any) {
            // Ignora erros relacionados ao sendSeen (marcar mensagem como lida)
            // Esses erros não são críticos e podem ocorrer quando a estrutura da mensagem
            // não está completamente disponível no WhatsApp Web
            if (error?.message?.includes('markedUnread') ||
                error?.message?.includes('sendSeen') ||
                error?.stack?.includes('sendSeen')) {
                console.warn('[WhatsAppMessageSender] Erro ao marcar mensagem como lida (não crítico):', error.message);
                // A mensagem ainda foi enviada, apenas não foi marcada como lida
                return;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async editMessage({ message, text, mentions }: { message: Message, text: string, mentions?: string[] }): Promise<void> {
        try {
            const messageText = this.formatMessageWithMentions(text, mentions);
            if (mentions && mentions.length > 0) {
                await message.edit(messageText, { mentions });
            } else {
                await message.edit(messageText);
            }
        } catch (error: any) {
            // Ignora erros relacionados ao sendSeen (marcar mensagem como lida)
            // Esses erros não são críticos e podem ocorrer quando a estrutura da mensagem
            // não está completamente disponível no WhatsApp Web
            if (error?.message?.includes('markedUnread') ||
                error?.message?.includes('sendSeen') ||
                error?.stack?.includes('sendSeen')) {
                console.warn('[WhatsAppMessageSender] Erro ao marcar mensagem como lida durante edição (não crítico):', error.message);
                // A mensagem ainda foi editada, apenas não foi marcada como lida
                return;
            }
            // Re-lança outros erros
            throw error;
        }
    }
}