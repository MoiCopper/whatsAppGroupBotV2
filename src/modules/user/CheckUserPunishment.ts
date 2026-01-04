import eventBus from "../../eventBus";
import dbRepository from "../../shared/storage";
import { DomainEvent, DomainEventType, MemberMessageSentPayload, PunishmentCheckedPayload } from '../../shared/types/domainEvents';

export default class CheckUserPunishment {
    constructor() {
        console.log('[CheckPunishments] Registrando listener para MEMBER_MESSAGE_SENT');
        eventBus.onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT).subscribe(async (event: DomainEvent<MemberMessageSentPayload>) => {
            console.log('[CheckPunishments] Evento MEMBER_MESSAGE_SENT recebido');
            await this.checkUserPunishment(event.payload);
        });
    }

    private async checkUserPunishment({groupId, memberId, message, chat, targetId, name}: MemberMessageSentPayload) {
        try {
            const member = await dbRepository.getMember(groupId, memberId);

            if (!member?.currentPunishment) {
                return;
            }

            // Emitir evento de verificação de punição
            eventBus.emit<PunishmentCheckedPayload>({
                type: DomainEventType.PUNISHMENT_CHECKED,
                payload: {
                    groupId: groupId,
                    memberId: memberId,
                    punishment: member.currentPunishment,
                    message: message,
                    chat: chat,
                    targetId: targetId,
                    name: name
                },
                metadata: {
                    groupId: groupId,
                    userId: memberId
                }
            });
        } catch (error) {
            console.error('[CheckPunishments] Erro ao verificar punição', error);
        }
    }
}