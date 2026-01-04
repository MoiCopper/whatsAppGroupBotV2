import { promises as fs } from 'fs';
import { join } from 'path';
import { DB, Group, Member, CreateAPunishmentParams } from '../types/db.interface';
import Cache from '../utils/Cache';
import eventBus from '../../eventBus';
import { DomainEvent, DomainEventType, MemberMessageSentPayload } from '../types/domainEvents';

export default class DbRepository {
    private dbPath: string;
    private cache: Cache<DB>;
    private readonly CACHE_TTL_MS = 5000; // 5 segundos de cache para o DB completo

    constructor(dbPath?: string) {
        this.dbPath = dbPath || join(process.cwd(), 'db.json');
        this.cache = new Cache<DB>();
        eventBus.onEvent(DomainEventType.MEMBER_MESSAGE_SENT).subscribe(async ({payload}: DomainEvent<MemberMessageSentPayload>) => {
            const {groupId, memberId, name, isAdmin, message} = payload;
            const group = await this.getGroup(groupId);
            if(!group) {
                return;
            }
            
            const member = group?.members[memberId];

            if(!member || member.name === '') {
                this.saveMember(groupId, {
                    id: memberId, 
                    name: name, 
                    isAdmin: isAdmin, 
                    punishments: {timeout: 0, mute: 0, ban: 0, kick: 0, warn: 0, note: ''}, 
                    menssagesIds: [], numberOfMessages: 0, currentPunishment: undefined});
            }
        });
    }

    /**
     * Deserializa objetos Date do JSON
     */
    private deserializeDates(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deserializeDates(item));
        }

        if (typeof obj === 'object') {
            const result: any = {};
            for (const key in obj) {
                if (key === 'appliedAt' || key === 'expiresAt') {
                    result[key] = obj[key] ? new Date(obj[key]) : null;
                } else {
                    result[key] = this.deserializeDates(obj[key]);
                }
            }
            return result;
        }

        return obj;
    }

    /**
     * Carrega o banco de dados do arquivo JSON
     */
    private async loadDb(): Promise<DB> {
        // Verifica cache primeiro
        const cached = this.cache.get('db');
        if (cached) {
            return cached;
        }

        try {
            const data = await fs.readFile(this.dbPath, 'utf-8');
            const parsed = JSON.parse(data);
            const db = this.deserializeDates(parsed) as DB;
            
            // Armazena no cache
            this.cache.set({ key: 'db', value: db, ttlMs: this.CACHE_TTL_MS });
            
            return db;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Arquivo não existe, retorna DB vazio
                const emptyDb: DB = { groups: {} };
                await this.saveDb(emptyDb);
                return emptyDb;
            }
            throw error;
        }
    }

    /**
     * Salva o banco de dados no arquivo JSON
     */
    private async saveDb(db: DB): Promise<void> {
        await fs.writeFile(this.dbPath, JSON.stringify(db, null, 2), 'utf-8');
        
        // Atualiza cache
        this.cache.set({ key: 'db', value: db, ttlMs: this.CACHE_TTL_MS });
    }

    /**
     * Invalida o cache do DB (útil após operações de escrita)
     */
    private invalidateCache(): void {
        this.cache.delete('db');
    }

    // ========== Operações de Grupo ==========

    /**
     * Obtém um grupo pelo ID
     */
    async getGroup(groupId: string): Promise<Group | undefined> {
        const db = await this.loadDb();
        return db.groups[groupId];
    }

    /**
     * Obtém todos os grupos
     */
    async getAllGroups(): Promise<Group[]> {
        const db = await this.loadDb();
        return Object.values(db.groups);
    }

    /**
     * Cria ou atualiza um grupo
     */
    async saveGroup(group: Group): Promise<void> {
        const db = await this.loadDb();
        db.groups[group.id] = group;
        await this.saveDb(db);
    }

    /**
     * Remove um grupo
     */
    async deleteGroup(groupId: string): Promise<void> {
        const db = await this.loadDb();
        delete db.groups[groupId];
        await this.saveDb(db);
    }

    // ========== Operações de Membro ==========

    /**
     * Obtém um membro de um grupo
     */
    async getMember(groupId: string, memberId: string): Promise<Member | undefined> {
        const group = await this.getGroup(groupId);
        return group?.members[memberId];
    }

    /**
     * Obtém todos os membros de um grupo
     */
    async getGroupMembers(groupId: string): Promise<Member[]> {
        const group = await this.getGroup(groupId);
        return group ? Object.values(group.members) : [];
    }

    /**
     * Cria ou atualiza um membro em um grupo
     */
    async saveMember(groupId: string, member: Member): Promise<void> {
        const db = await this.loadDb();
        
        if (!db.groups[groupId]) {
            throw new Error(`Group ${groupId} not found`);
        }

        db.groups[groupId].members[member.id] = member;
        await this.saveDb(db);
    }

    /**
     * Remove um membro de um grupo
     */
    async deleteMember(groupId: string, memberId: string): Promise<void> {
        const db = await this.loadDb();
        
        if (db.groups[groupId]?.members[memberId]) {
            delete db.groups[groupId].members[memberId];
            await this.saveDb(db);
        }
    }

    // ========== Operações de Punishment ==========

    /**
     * Cria uma punição para um membro
     */
    async createPunishment(params: CreateAPunishmentParams): Promise<void> {
        const db = await this.loadDb();
        const group = db.groups[params.groupId];
        
        if (!group) {
            throw new Error(`Group ${params.groupId} not found`);
        }

        const member = group.members[params.memberId];
        if (!member) {
            throw new Error(`Member ${params.memberId} not found in group ${params.groupId}`);
        }

        // Incrementa contador de punições
        member.punishments[params.type] = (member.punishments[params.type] || 0) + 1;

        // Define punição atual
        member.currentPunishment = {
            type: params.type,
            duration: params.duration,
            reason: params.reason,
            appliedAt: new Date(),
            expiresAt: params.expiresAt,
        };

        await this.saveDb(db);
    }

    /**
     * Remove a punição atual de um membro
     */
    async removeCurrentPunishment(groupId: string, memberId: string): Promise<void> {
        const db = await this.loadDb();
        const member = db.groups[groupId]?.members[memberId];
        
        if (member) {
            delete member.currentPunishment;
            await this.saveDb(db);
        }
    }

    /**
     * Incrementa o número de mensagens de um membro
     */
    async incrementMemberMessages(groupId: string, memberId: string, messageId: string): Promise<void> {
        const db = await this.loadDb();
        const member = db.groups[groupId]?.members[memberId];
        
        if (member) {
            member.numberOfMessages = (member.numberOfMessages || 0) + 1;
            if (!member.menssagesIds) {
                member.menssagesIds = [];
            }
            member.menssagesIds.push(messageId);
            await this.saveDb(db);
        }
    }

    async getMemberName(groupId: string, memberId: string): Promise<string> {
        const member = await this.getMember(groupId, memberId);
        return member?.name || '[FULANO(A)]';
    }
}

