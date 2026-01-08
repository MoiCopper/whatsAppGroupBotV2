import MemberRepository from './MemberRepository';
import GroupRepository from './GroupRepository';
import ChatGroupRepository from './ChatGroupRepository';
import PunishmentRepository from './PunishmentRepository';

/**
 * Instância singleton do MemberRepository
 * Use esta instância em toda a aplicação
 * 
 * IMPORTANTE: initDb() deve ser chamado antes de usar o memberRepository
 * para garantir que o PrismaClient seja inicializado corretamente
 */
const memberRepository = new MemberRepository();

/**
 * Instância singleton do GroupRepository
 * Use esta instância em toda a aplicação
 * 
 * IMPORTANTE: initDb() deve ser chamado antes de usar o groupRepository
 * para garantir que o PrismaClient seja inicializado corretamente
 */
const groupRepository = new GroupRepository();

/**
 * Instância singleton do ChatGroupRepository
 * Use esta instância em toda a aplicação
 * 
 * IMPORTANTE: initDb() deve ser chamado antes de usar o chatGroupRepository
 * para garantir que o PrismaClient seja inicializado corretamente
 */
const chatGroupRepository = new ChatGroupRepository();

/**
 * Instância singleton do PunishmentRepository
 * Use esta instância em toda a aplicação
 * 
 * IMPORTANTE: initDb() deve ser chamado antes de usar o punishmentRepository
 * para garantir que o PrismaClient seja inicializado corretamente
 */
const punishmentRepository = new PunishmentRepository();

export {
    memberRepository,
    MemberRepository,
    groupRepository,
    GroupRepository,
    chatGroupRepository,
    ChatGroupRepository,
    punishmentRepository,
    PunishmentRepository
};
export * from './initDb';

