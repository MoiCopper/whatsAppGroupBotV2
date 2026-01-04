import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DomainEvent } from '../types/domainEvents';

/**
 * EventBus reativo usando RxJS
 * Permite emitir e escutar eventos com tipos customizados
 */
class EventBus {
  private eventSubject: Subject<DomainEvent>;

  constructor() {
    this.eventSubject = new Subject<DomainEvent>();
  }

  /**
   * Emite um evento de domínio
   * @param event - Evento de domínio com tipo, payload e metadata
   * @example
   * eventBus.emit<MemberMessageSentPayload>({
   *   type: DomainEventType.MEMBER_MESSAGE_SENT,
   *   payload: { groupId: '123', memberId: '456', ... },
   *   metadata: { groupId: '123', userId: '456' }
   * });
   */
  emit<TPayload = any>(event: DomainEvent<TPayload>): void {
    const eventWithTimestamp: DomainEvent<TPayload> = {
      ...event,
      metadata: {
        ...event.metadata,
        timestamp: Date.now(),
      },
    };
    this.eventSubject.next(eventWithTimestamp);
  }

  /**
   * Retorna um Observable para escutar todos os eventos
   * @returns Observable de eventos de domínio
   */
  on(): Observable<DomainEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Retorna um Observable filtrado por tipo de evento
   * @param eventType - Tipo de evento para filtrar
   * @returns Observable de eventos do tipo especificado
   * @example
   * eventBus.onEvent(DomainEventType.MEMBER_MESSAGE_SENT)
   *   .subscribe((event) => {
   *     const payload = event.payload as MemberMessageSentPayload;
   *     console.log(payload.groupId);
   *   });
   */
  onEvent<TPayload = any>(
    eventType: DomainEvent['type']
  ): Observable<DomainEvent<TPayload>> {
    return this.eventSubject.pipe(
      filter((event: DomainEvent) => event.type === eventType)
    ) as Observable<DomainEvent<TPayload>>;
  }
}

export default EventBus;

