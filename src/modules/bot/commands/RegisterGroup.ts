import { DomainEvent, DomainEventType, CommandExecutedPayload, SendMessagePayload } from "../../../shared/types/domainEvents";
import eventBus from "../../../eventBus";
import { GroupChat, Message } from "whatsapp-web.js";
import dbRepository from "../../../shared/storage";
import { Member } from "../../../shared/types/db.interface";

export class RegisterGroupCommand {
    constructor() {
        eventBus.onEvent<CommandExecutedPayload>(DomainEventType.COMMAND_EXECUTED).subscribe(async ({payload}: DomainEvent<CommandExecutedPayload>) => {
            console.log('[RegisterGroupCommand] Evento COMMAND_EXECUTED recebido, command:', payload.command);
            if(payload.command === '/registerGroup'){
                await this.execute(payload);    
            }
        });
    }

    async execute({message, chat}: CommandExecutedPayload): Promise<void> {
        try {
            await this.registerGroup(message, chat);
        } catch (error) {
            console.error('[RegisterGroupCommand] Erro ao executar comando:', error);
            throw error;
        }
    }

    async registerGroup(msg: Message, chat:GroupChat) {
        const groupId = chat.id._serialized;
        const groupName = chat.name;

        const isGroupRegistered = await dbRepository.getGroup(groupId);
        if(isGroupRegistered !== undefined){
            eventBus.emit<SendMessagePayload>({
                type: DomainEventType.SEND_MESSAGE,
                payload: {
                    chatId: msg.from,
                    text: `BOT: Grupo ${groupName} já está registrado meu amooor 😍🤖`,
                    message: msg
                }
            });
            return;
        }

        const groupDescription = chat.description;
        const members: Record<string, Member> = {};
        const participants = chat.participants;
        for(const participant of participants){
            members[participant.id._serialized] = {
                id: participant.id._serialized,
                name: '',
                isAdmin: participant.isAdmin,
                punishments: {
                    timeout: 0,
                    mute: 0,
                    ban: 0,
                    kick: 0,
                    warn: 0,
                    note: '',
                },
                menssagesIds: [],
                numberOfMessages: 0
            };
        }

        const group = await dbRepository.saveGroup({
            id: groupId,
            name: groupName,
            description: groupDescription,
            members: members,
        });

        eventBus.emit<SendMessagePayload>({
            type: DomainEventType.SEND_MESSAGE,
            payload: {
                chatId: msg.from,
                text: `BOT: Grupo ${groupName} registrado com sucesso`,
                message: msg
            }
        });

        return group;
    }
}