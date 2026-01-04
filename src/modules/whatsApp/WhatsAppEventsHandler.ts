import { Client, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import eventBus from '../../eventBus';
import { DomainEventType, MemberMessageSentPayload } from '../../types/domainEvents';
import WhatsAppRepository from './WhatsAppRepository';
import { EventsType } from './WhatsAppDtos';

export default class WhatsAppEventsHandler {
    private client: Client;
    private whatsAppRepository: WhatsAppRepository;
    constructor(client: Client, whatsAppRepository: WhatsAppRepository) {
        this.client = client;
        this.whatsAppRepository = whatsAppRepository;
    }

    registerEvents() {
        this.client.on('qr', (qr) => {
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('Client is ready!');
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
        if(!groupParticipant.participant){
            console.error('Group participant not found', 'WhatsAppRepository.registerEvents.MESSAGE_CREATE');
            return;
        }
        const chat = await this.whatsAppRepository.getChat(msg);
        eventBus.emit<MemberMessageSentPayload>({
            type: DomainEventType.MEMBER_MESSAGE_SENT,
            payload: {
                groupId: chat.id._serialized,
                memberId: groupParticipant.id,
                name: this.whatsAppRepository.getNotifyName(msg),
                isAdmin: groupParticipant.participant?.isAdmin || false,
                message: msg
            },
            metadata: {
                groupId: chat.id._serialized,
                userId: groupParticipant.id
            }
        });
    }
}