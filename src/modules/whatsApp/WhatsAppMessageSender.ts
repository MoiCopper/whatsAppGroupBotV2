import { Client, Message } from "whatsapp-web.js";
import eventBus from "../../eventBus";
import { DomainEvent, DomainEventType, SendMessagePayload } from "../../shared/types/domainEvents";
import { debounceTime, distinctUntilChanged } from "rxjs";

export class WhatsAppMessageSender {
    private client: Client;
    constructor(client: Client) {
        this.client = client;
        eventBus.onEvent(DomainEventType.SEND_MESSAGE).pipe(distinctUntilChanged((prev, curr) => prev.payload.text === curr.payload.text )).pipe(debounceTime(300)).subscribe(async ({payload}: DomainEvent<SendMessagePayload>) => {
            if(payload.message){
                await this.replyMessage(payload.message, payload.text);
                return;
            }
            await this.sendMessage({chatId: payload.chatId, text: payload.text});
        });
    }

    async sendMessage({chatId, text}: {chatId: string, text: string}): Promise<void> {
        await this.client.sendMessage(chatId, text);
    }

    async replyMessage(message: Message, text: string): Promise<void> {
        await message.reply(text);
    }
}