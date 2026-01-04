import { Message, GroupParticipant } from "whatsapp-web.js";

export interface IWhatsAppParticipant {
    id: string;
    author: string | undefined;
    participant: GroupParticipant | undefined;
}

export enum EventsType {
    READY = 'ready',
    QR = 'qr',
    MESSAGE_CREATE = 'message_create',
    AUTH_FAILURE = 'auth_failure',
    DISCONNECTED = 'disconnected',
}

export interface IWhatsAppEvent {
    event: EventsType.READY | EventsType.QR | EventsType.MESSAGE_CREATE | EventsType.AUTH_FAILURE | EventsType.DISCONNECTED;
    data: string | Message | null;
}

export interface IWhatsAppParticipant {
    id: string;
    author: string | undefined;
    participant: GroupParticipant | undefined;
}