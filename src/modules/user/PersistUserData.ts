import { Member } from "@prisma/client";
import eventBus from "../../eventBus";
import { memberRepository, groupRepository, chatGroupRepository } from "../../shared/storage";
import { DomainEvent, DomainEventType, MemberMessageSentPayload, PunishmentCheckedPayload } from '../../shared/types/domainEvents';

export default class PersistUserData {
    constructor() {
        console.log('[PersistUserData] Registrando listener para MEMBER_MESSAGE_SENT');
        eventBus.onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT).subscribe(async (event: DomainEvent<MemberMessageSentPayload>) => {
            console.log('[PersistUserData] Evento MEMBER_MESSAGE_SENT recebido');
            const group = await groupRepository.getGroup(event.payload.groupId);

            if (!group) {
                return;
            }

            const member = await this.checkUserExists(event.payload);

            const defaultName = "[FULANO(A)]";

            if ((member && member.name === defaultName) && event.payload.name !== defaultName) {
                await this.updateMemberName(member.id, event.payload.name);
            }
        });
    }

    private async checkUserExists({ groupId, memberId, message, name, isAdmin }: MemberMessageSentPayload): Promise<Member | null> {
        try {

            let member = await memberRepository.getMember(memberId);

            if (!member) {
                member = await memberRepository.createMember({
                    whatsAppMemberId: memberId,
                    name: name,
                    authorId: message.author,
                });

                chatGroupRepository.createChatGroup({
                    groupId: groupId,
                    memberId: memberId,
                    isAdmin: isAdmin,
                    numberOfMessages: 1,
                });
            }

            return member;
        } catch (error) {
            console.error('[PersistUserData] Erro ao persistir usuário', error);
            return null;
        }
    }

    private async updateMemberName(memberId: string, name: string): Promise<void> {
        try {
            await memberRepository.updateMember(memberId, {
                name: name,
            });
        } catch (error) {
            console.error('[PersistUserData] Erro ao atualizar nome do usuário', error);
        }
    }
}