/**
 * Exemplo de uso do EventBus
 * Este arquivo demonstra como usar o eventBus na aplicação
 */

import eventBus from '../eventBus';
import {
  DomainEventType,
  MemberMessageSentPayload,
} from '../shared/types/domainEvents';

// Exemplo 1: Emitir um evento com tipo customizado
export function emitMemberMessageSent() {
  eventBus.emit<MemberMessageSentPayload>({
    type: DomainEventType.MEMBER_MESSAGE_SENT,
    payload: {
      groupId: '123456789',
      memberId: '987654321',
      name: 'João Silva',
      isAdmin: false,
      message: {} as any, // Substitua pelo tipo correto do whatsapp-web.js
    },
    metadata: {
      groupId: '123456789',
      userId: '987654321',
    },
  });
}

// Exemplo 2: Escutar todos os eventos
export function listenToAllEvents() {
  eventBus.on().subscribe((event) => {
    console.log('Evento recebido:', event.type, event.payload);
  });
}

// Exemplo 3: Escutar apenas eventos específicos com tipo customizado
export function listenToMemberMessageSent() {
  eventBus
    .onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT)
    .subscribe((event) => {
      // TypeScript agora sabe que event.payload é do tipo MemberMessageSentPayload
      const { groupId, memberId, name, isAdmin, message } = event.payload;
      console.log(`Mensagem de ${name} no grupo ${groupId}`);
      console.log(`É admin: ${isAdmin}`);
      console.log(`Metadata:`, event.metadata);
    });
}

// Exemplo 4: Múltiplos listeners para o mesmo evento
export function setupMultipleListeners() {
  // Listener 1: Log
  eventBus
    .onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT)
    .subscribe((event) => {
      console.log('[Logger]', event.payload);
    });

  // Listener 2: Processamento
  eventBus
    .onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT)
    .subscribe((event) => {
      // Processar mensagem
      console.log('[Processor]', 'Processando mensagem...');
    });
}

