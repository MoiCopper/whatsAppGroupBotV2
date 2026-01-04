/**
 * Exemplos de uso do DbRepository
 */

import { initDb } from '../initDb';
import { Group, Member } from '../../../types/db.interface';

async function examples() {
    // Inicializa o DB
    const dbRepository = await initDb();

    // ========== Exemplo 1: Criar um grupo ==========
    const group: Group = {
        id: 'group123',
        name: 'Grupo de Teste',
        description: 'Descrição do grupo',
        members: {},
    };
    await dbRepository.saveGroup(group);

    // ========== Exemplo 2: Adicionar um membro ==========
    const member: Member = {
        id: 'member456',
        name: 'João Silva',
        isAdmin: false,
        punishments: {
            timeout: 0,
            mute: 0,
            ban: 0,
            kick: 0,
            warn: 0,
            note: '',
        },
        menssagesIds: [],
        numberOfMessages: 0,
    };
    await dbRepository.saveMember('group123', member);

    // ========== Exemplo 3: Buscar um grupo ==========
    const foundGroup = await dbRepository.getGroup('group123');
    console.log('Grupo encontrado:', foundGroup?.name);

    // ========== Exemplo 4: Buscar um membro ==========
    const foundMember = await dbRepository.getMember('group123', 'member456');
    console.log('Membro encontrado:', foundMember?.name);

    // ========== Exemplo 5: Criar uma punição ==========
    await dbRepository.createPunishment({
        groupId: 'group123',
        memberId: 'member456',
        type: 'timeout',
        duration: 300000, // 5 minutos em ms
        reason: 'Spam de mensagens',
        expiresAt: new Date(Date.now() + 300000),
    });

    // ========== Exemplo 6: Incrementar mensagens ==========
    await dbRepository.incrementMemberMessages('group123', 'member456', 'msg789');

    // ========== Exemplo 7: Buscar todos os membros de um grupo ==========
    const members = await dbRepository.getGroupMembers('group123');
    console.log('Total de membros:', members.length);
}

// Descomente para executar os exemplos
// examples().catch(console.error);

