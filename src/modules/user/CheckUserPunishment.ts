import eventBus from "../../eventBus";
import { punishmentRepository } from "../../shared/storage";
import { DomainEvent, DomainEventType, MemberMessageSentPayload, PunishmentCheckedPayload } from '../../shared/types/domainEvents';

export default class CheckUserPunishment {
    constructor() {
        console.log('[CheckPunishments] Registrando listener para MEMBER_MESSAGE_SENT');
        eventBus.onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT).subscribe(async (event: DomainEvent<MemberMessageSentPayload>) => {
            console.log('[CheckPunishments] Evento MEMBER_MESSAGE_SENT recebido');
            await this.checkUserPunishment(event.payload);
        });
    }

    private async checkUserPunishment({ groupId, memberId, message, chat, targetId, name, targetAuthorId }: MemberMessageSentPayload) {
        try {
            const punishment = await punishmentRepository.getPunishment(memberId);

            if (!punishment) {
                return;
            }

            // Emitir evento de verificação de punição
            eventBus.emit<PunishmentCheckedPayload>({
                type: DomainEventType.PUNISHMENT_CHECKED,
                payload: {
                    memberId: memberId,
                    punishment: punishment,
                    message: message,
                    chat: chat,
                    targetId: targetId,
                    name: name,
                },
                metadata: {
                    groupId: groupId,
                    userId: memberId,
                }
            });
        } catch (error) {
            console.error('[CheckPunishments] Erro ao verificar punição', error);
        }
    }
}