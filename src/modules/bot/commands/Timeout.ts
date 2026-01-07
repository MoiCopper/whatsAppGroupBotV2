import { DomainEvent, DomainEventType, CommandExecutedPayload, PunishmentCheckedPayload, SendMessagePayload } from "../../../shared/types/domainEvents";
import eventBus from "../../../eventBus";
import { GroupChat, Message } from "whatsapp-web.js";
import { extractTimeArgument } from "../../../shared/utils/extractTimeArgument";
import { parseTimeToMs } from "../../../shared/utils/parseTimeToMs";
import { formatTimeDuration } from "../../../shared/utils/formatTimeDuration";
import { punishmentRepository, groupRepository, memberRepository, chatGroupRepository } from "../../../shared/storage";
import { differenceInMilliseconds, isBefore } from "date-fns";
import { safeDeleteMessage } from "../../../shared/utils/safeMessageDelete";
import { Punishment } from "@prisma/client";

export class TimeoutCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[TimeoutCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command === '/timeout') {
                console.log('[TimeoutCommand] Processando comando /timeout');
                await this.execute(payload);
            }
        });

        eventBus.onEvent(DomainEventType.PUNISHMENT_CHECKED).subscribe(async ({ payload }: DomainEvent<PunishmentCheckedPayload>) => {
            console.log('[TimeoutCommand] Evento PUNISHMENT_CHECKED recebido');
            if (payload.punishment.type === 'timeout') {
                await this.checkAndRemoveExpiredTimeout({
                    memberId: payload.memberId,
                    message: payload.message,
                    punishment: payload.punishment,
                    chat: payload.chat,
                    name: payload.name
                });
            }
        });
    }

    async execute(props: CommandExecutedPayload): Promise<void> {
        if (!props.targetId || !props.targetName) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: props.message.from,
                    text: 'BOT: Não foi possível identificar o mamador alvo'
                }
            });
            return;
        }
        try {
            await this.timeoutUser({
                message: props.message,
                chat: props.chat,
                targetName: props.targetName,
                targetId: props.targetId,
                targetAuthorId: props.targetAuthorId
            });
        } catch (error) {
            console.error(error as Error, 'TimeoutCommand.execute');
            throw error;
        }
    }

    async timeoutUser({ message, chat, targetName, targetId, targetAuthorId }: { message: Message, chat: GroupChat, targetName: string, targetId: string, targetAuthorId: string | null }): Promise<void> {
        const timeStr = extractTimeArgument(message.body);
        const timeoutMs = parseTimeToMs(timeStr);
        const durationText = formatTimeDuration(timeoutMs);
        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: message.from,
                text: `BOT: ${targetName} vai mamar por ${durationText}`,
                message: message
            }
        });

        const expiresAt = new Date(Date.now() + timeoutMs);
        const group = await groupRepository.getGroup(chat.id._serialized);
        if (!group) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: 'BOT: Grupo não encontrado',
                    message: message
                }
            });
            return;
        }

        // Obter ou criar o Member
        let member = await memberRepository.getMember(targetId);
        if (!member) {
            // Criar membro se não existir
            member = await memberRepository.createMember({
                whatsAppMemberId: targetId,
                name: targetName,
                authorId: targetAuthorId ?? ''
            });
        }

        // Obter ou criar o ChatGroups (relação entre Group e Member)
        const chatGroup = await chatGroupRepository.getOrCreateChatGroup(group.id, member.id);

        // Criar a punição usando o chatGroupId correto
        await punishmentRepository.createPunishment({
            memberId: member.id,
            chatGroupId: chatGroup.id,
            groupId: group.id,
            type: 'timeout',
            duration: timeoutMs,
            reason: 'Mamar',
            expiresAt: expiresAt,
            isActive: true,
            whatsAppGroupId: chat.id._serialized,
            whatsAppMemberId: targetId
        });
    }

    async checkAndRemoveExpiredTimeout({ memberId, message, punishment, chat, name }: { memberId: string, message: Message, punishment: Punishment, chat: GroupChat, name: string }): Promise<void> {
        const now = new Date(Date.now());
        if (punishment.expiresAt && isBefore(punishment.expiresAt as Date, now)) {
            await punishmentRepository.deactivatePunishment(memberId);

            // Emitir evento de timeout removido (expirado)
            //TODO mensionar o usuario que foi desmutado
            // eventBus.emit({
            //     type: DomainEventType.TIMEOUT_REMOVED,
            //     payload: {
            //         groupId: groupId,
            //         memberId: memberId,
            //         reason: 'expired'
            //     },
            //     metadata: {
            //         groupId: groupId,
            //         userId: memberId
            //     }
            // });

            return;
        }

        const punishmentDurationTimeLeft = differenceInMilliseconds(punishment.expiresAt as Date, now);
        const punishmentDurationTimeLeftText = formatTimeDuration(punishmentDurationTimeLeft);
        this.safeDelete(message);

        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: chat.id._serialized,
                text: `BOT: CALMA ${name.toUpperCase()}, VOCE ESTA DE BOCA CHEIA GLUB GLUB GLUB 🍆🍆🍆, ainda faltam ${punishmentDurationTimeLeftText} de mamada`,
            }
        });
    }

    async safeDelete(message: Message): Promise<boolean> {
        return await safeDeleteMessage(message, true, 3);
    }
}