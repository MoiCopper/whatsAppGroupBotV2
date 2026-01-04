import { Client, GroupChat, Message } from "whatsapp-web.js";
import Cache from "../../shared/utils/Cache";
import { IWhatsAppParticipant } from "./WhatsAppDtos";

export default class WhatsAppRepository {
    private client: Client;
    private cache: Cache<GroupChat>;

    constructor(client: Client, cache: Cache<GroupChat>) {
        this.client = client;
        this.cache = cache;
    }

    public async getChat(message: Message): Promise<GroupChat> {
        const chatId = message.from;
        const chat = this.cache.get(chatId);

        if (chat) {
            return chat;
        }
        
        const newChat = await message.getChat() as GroupChat;
        const cacheTime = 20000;
        this.cache.set({
            key: chatId, 
            value: newChat, 
            ttlMs: cacheTime});
        return newChat;
    }

    public async getParticipant(msg: Message): Promise<IWhatsAppParticipant> {
        let userId = msg.author || msg.from;
        const chat = await this.getChat(msg)
        let participant = chat.participants.find(
            p => p.id._serialized === userId || (p as any).id_serialized === userId
        );
        
        // If participant not found and userId is @lid formxat, convert it to @c.us format
        if (!participant && userId) {
            const phoneNumberId = await this.convertLidToPhoneNumber(userId);
            if (phoneNumberId) {
                userId = phoneNumberId;
                participant = chat.participants.find(
                    p => p.id._serialized === userId
                );
            }
        }

        return { id: userId, author: msg.author, participant: participant };
    }

    public async convertLidToPhoneNumber(userId: string): Promise<string | null> {
        // If not @lid format or pupPage not available, return null
        if (!userId || !userId.endsWith('@lid') || !this.client.pupPage) {
            return userId;
        }

        try {
            // Use WidFactory to create proper WhatsApp ID object, then convert using LidUtils
            const phoneNumberId = await this.client.pupPage.evaluate((userIdStr: string) => {
                // @ts-ignore - window is available in browser context
                if (window.Store && window.Store.WidFactory && window.Store.LidUtils) {
                    try {
                        // @ts-ignore
                        const wid = window.Store.WidFactory.createWid(userIdStr);
                        // Convert lid to phone number if it's a lid format
                        // @ts-ignore
                        if (wid.server === 'lid' && window.Store.LidUtils.getPhoneNumber) {
                            // @ts-ignore
                            const phoneId = window.Store.LidUtils.getPhoneNumber(wid);
                            return phoneId ? phoneId._serialized : null;
                        }
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            }, userId);

            return phoneNumberId || null;
        } catch (error) {
            console.warn('Failed to convert lid ID to phone number:', error);
            return null;
        }
    }

    public getNotifyName(msg: Message): string {
        const msgString = JSON.stringify(msg);
        return msgString.split('"notifyName":"')[1]?.split('",')[0] || '[FULANO(A)]';
    }

    public isBotMessage(msg: Message): boolean {
        return msg.fromMe && msg.body.includes('BOT:');
    }

    public async isGroupChat(msg: Message): Promise<boolean> {
        const chat = await this.getChat(msg);
        return chat.isGroup;
    }
}