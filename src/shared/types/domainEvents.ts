import { GroupChat, Message } from "whatsapp-web.js";
import { CurrentPunishment } from "./db.interface";

/**
 * Tipos de eventos de domínio
 */
export enum DomainEventType {
  MEMBER_MESSAGE_SENT = 'MEMBER_MESSAGE_SENT',
  PUNISHMENT_CHECKED = 'PUNISHMENT_CHECKED',
  COMMAND_EXECUTED = 'COMMAND_EXECUTED',
  SEND_MESSAGE = 'SEND_MESSAGE',
  // Adicione outros tipos de eventos aqui conforme necessário
}

/**
 * Payload para o evento MEMBER_MESSAGE_SENT
 */
export interface MemberMessageSentPayload {
  groupId: string;
  memberId: string;
  name: string;
  isAdmin: boolean;
  message: any; // Ajuste o tipo conforme necessário (Message do whatsapp-web.js)
  chat: GroupChat;
  targetId: string | null;
  targetName: string | null;
}

// Payload para PUNISHMENT_CHECKED
export interface PunishmentCheckedPayload {
  groupId: string;
  memberId: string;
  message: Message;
  punishment: CurrentPunishment
  targetId: string | null;
  name: string;
  chat: GroupChat;
}

export interface CommandExecutedPayload {
  command: string;
  message: Message;
  chat: GroupChat;
  targetId: string | null;
  targetName: string | null;
}

export interface SendMessagePayload {
  chatId: string;
  text: string;
  message?: Message;
}

/**
 * Metadata genérica para eventos
 */
export interface EventMetadata {
  groupId?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Estrutura base de um evento de domínio
 */
export interface DomainEvent<TPayload = any> {
  type: DomainEventType;
  payload: TPayload;
  metadata?: EventMetadata;
}

