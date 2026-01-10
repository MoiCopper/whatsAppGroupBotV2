import { DomainEvent, DomainEventType, CommandExecutedPayload, SendMessagePayload } from "../../../shared/types/domainEvents";
import eventBus from "../../../eventBus";
import { GroupChat, Message } from "whatsapp-web.js";
import { punishmentRepository, groupRepository, memberRepository, chatGroupRepository, blacklistRepository } from "../../../shared/storage";
import { safeDeleteMessage } from "../../../shared/utils/safeMessageDelete";

export class BanCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({ payload }: DomainEvent<CommandExecutedPayload>) => {
            console.log('[BanCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if (payload.command.toLowerCase() === '/ban') {
                console.log('[BanCommand] Processando comando /ban');
                await this.execute(payload);
            }
        });
    }

    async execute(props: CommandExecutedPayload): Promise<void> {
        if (!props.targetId || !props.targetName) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: props.message.from,
                    text: 'BOT: Não foi possível identificar o usuário alvo'
                }
            });
            return;
        }
        try {
            await this.banUser({
                message: props.message,
                chat: props.chat,
                targetName: props.targetName,
                targetId: props.targetId,
                targetAuthorId: props.targetAuthorId
            });
        } catch (error) {
            console.error(error as Error, 'BanCommand.execute');
            throw error;
        }
    }

    async banUser({ message, chat, targetName, targetId, targetAuthorId }: { message: Message, chat: GroupChat, targetName: string, targetId: string, targetAuthorId: string | null }): Promise<void> {
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

        // Verificar se o usuário já está na blacklist
        const isAlreadyBlacklisted = await blacklistRepository.isBlacklisted(targetId);
        if (isAlreadyBlacklisted) {
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: `BOT: ${targetName} já está na blacklist`,
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

        // Criar a punição de ban
        await punishmentRepository.createPunishment({
            memberId: member.id,
            chatGroupId: chatGroup.id,
            groupId: group.id,
            type: 'ban',
            duration: 0, // Ban permanente não tem duração
            reason: 'Banimento permanente',
            expiresAt: null, // Ban permanente não expira
            isActive: true,
            whatsAppGroupId: chat.id._serialized,
            whatsAppMemberId: targetId
        });

        // Adicionar à blacklist
        await blacklistRepository.addToBlacklist({
            memberId: member.id,
            reason: 'Banimento permanente',
            bannedBy: targetAuthorId ?? undefined,
            bannedFromGroupId: chat.id._serialized,
            notes: `Banido por comando /ban`
        });

        // Atualizar contador de ban no ChatGroup
        chatGroup.banCount++;
        await chatGroupRepository.updateChatGroup(chatGroup);

        // Remover o participante do grupo usando removeParticipants
        try {
            await chat.removeParticipants([targetId]);

            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: `BOT: ${targetName} foi banido permanentemente e adicionado à blacklist`,
                    message: message
                }
            });
        } catch (error) {
            console.error('[BanCommand] Erro ao remover participante:', error);
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: message.from,
                    text: `BOT: ${targetName} foi adicionado à blacklist, mas houve um erro ao removê-lo do grupo`,
                    message: message
                }
            });
        }

        // Deletar a mensagem do comando
        // await safeDeleteMessage(message, true, 3);
    }
}

