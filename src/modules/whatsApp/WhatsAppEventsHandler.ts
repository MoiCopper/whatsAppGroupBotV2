import { Client, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import eventBus from '../../eventBus';
import { DomainEventType, MemberMessageSentPayload } from '../../shared/types/domainEvents';
import WhatsAppRepository from './WhatsAppRepository';
import { EventsType } from './WhatsAppDtos';
import { memberRepository } from '../../shared/storage';

export default class WhatsAppEventsHandler {
    private client: Client;
    private whatsAppRepository: WhatsAppRepository;
    private qrCode: string | null = null; // Armazena o QR code atual
    private isReady: boolean = false; // Indica se o cliente está conectado

    constructor(client: Client, whatsAppRepository: WhatsAppRepository) {
        this.client = client;
        this.whatsAppRepository = whatsAppRepository;
    }

    /**
     * Retorna o QR code atual (se disponível)
     */
    public getQrCode(): string | null {
        return this.qrCode;
    }

    /**
     * Retorna se o cliente está conectado e pronto
     */
    public getIsReady(): boolean {
        return this.isReady;
    }

    registerEvents() {
        this.client.on('qr', (qr) => {
            this.qrCode = qr; // Armazena o QR code
            qrcode.generate(qr, { small: true });
            console.log('QR Code', qr);
        });

        this.client.on('ready', () => {
            console.log('Client is ready!');
            this.isReady = true;
            this.qrCode = null; // Limpa o QR code quando conectado
        });

        this.client.on(EventsType.MESSAGE_CREATE, async (msg) => {
            if (this.whatsAppRepository.isBotMessage(msg)) {
                return;
            }

            const isGroupChat = await this.whatsAppRepository.isGroupChat(msg);

            if (!isGroupChat) {
                return;
            }

            await this.emitMemberMessageSent(msg);
        });

        this.client.on('disconnected', () => {
            console.log('Client disconnected');
        });

        this.client.on('error', (err) => {
            console.error('Error', err);
        });
    }


    private async emitMemberMessageSent(msg: Message): Promise<void> {
        const groupParticipant = await this.whatsAppRepository.getParticipant(msg);
        if (!groupParticipant.participant) {
            console.error('Group participant not found', 'WhatsAppRepository.registerEvents.MESSAGE_CREATE');
            return;
        }
        const chat = await this.whatsAppRepository.getChat(msg);
        const targetUserId = await this.getTargetUserId(msg);
        let targetName = '[FULANO(A)]';
        if (targetUserId) {
            targetName = await this.getNotifyNameById(targetUserId, chat.id._serialized);
        }

        eventBus.emit<MemberMessageSentPayload>({
            type: DomainEventType.MEMBER_MESSAGE_SENT,
            payload: {
                groupId: chat.id._serialized,
                memberId: groupParticipant.id,
                name: this.whatsAppRepository.getNotifyName(msg),
                isAdmin: groupParticipant.participant?.isAdmin || false,
                message: msg,
                chat: chat,
                targetId: targetUserId,
                targetName: targetName,
                targetAuthorId: msg.mentionedIds[0] || null
            },
            metadata: {
                groupId: chat.id._serialized,
                userId: groupParticipant.id
            }
        });
    }

    public async getTargetUserId(msg: Message): Promise<string | null> {
        let targetUserId = null;
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            const participant = await this.whatsAppRepository.getParticipant(quotedMsg);
            targetUserId = participant.id;
        } else {
            targetUserId = await this.whatsAppRepository.convertLidToPhoneNumber(msg.mentionedIds[0]);
        }
        return targetUserId;
    }

    public async getNotifyNameById(id: string, chatId: string): Promise<string> {
        try {
            // const contact = await this.client.getContactById(id);
            // return contact.name || dBRepository.getUserName(groupId || '', id);
            const member = await memberRepository.getMember(id);
            if (!member) {
                return '[FULANO(A)]';
            }
            return member.name;
        } catch (error) {
            console.error('Error getting notify name by id', error);
            return '[FULANO(A)]';
        }
    }
}