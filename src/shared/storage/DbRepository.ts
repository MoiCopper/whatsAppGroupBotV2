import { promises as fs } from 'fs';
import { join } from 'path';
import { DB, Group, Member, CreateAPunishmentParams } from '../types/db.interface';
import Cache from '../utils/Cache';
import eventBus from '../../eventBus';
import { DomainEvent, DomainEventType, MemberMessageSentPayload } from '../types/domainEvents';

type WriteOperation = () => Promise<void>;

export default class DbRepository {
    private dbPath: string;
    private cache: Cache<DB>;
    private readonly CACHE_TTL_MS = 30000; // 30 segundos de cache para o DB completo (aumentado de 5s)
    private writeQueue: Promise<void> = Promise.resolve(); // Fila de escrita para serializar operações
    private isWriting: boolean = false; // Lock para operações de escrita
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map(); // Debounce por chave (groupId:memberId)
    private readonly DEBOUNCE_MS = 1000; // 1 segundo de debounce para saveMember

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
                // Usa debounce para evitar múltiplas escritas do mesmo membro
                this.saveMemberDebounced(groupId, {
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
     * Thread-safe: múltiplas leituras podem acontecer simultaneamente
     */
    private async loadDb(): Promise<DB> {
        // Verifica cache primeiro
        const cached = this.cache.get('db');
        if (cached) {
            return cached;
        }

        try {
            const data = await fs.readFile(this.dbPath, 'utf-8');
            
            // Verifica se o arquivo está vazio ou só tem whitespace
            const trimmedData = data.trim();
            if (!trimmedData || trimmedData === '') {
                console.warn('[DB] Arquivo db.json está vazio. Criando DB vazio.');
                const emptyDb: DB = { groups: {} };
                await this.enqueueWrite(() => this.saveDbInternal(emptyDb));
                return emptyDb;
            }

            let parsed;
            try {
                parsed = JSON.parse(trimmedData);
            } catch (parseError: any) {
                // JSON inválido ou corrompido
                console.error('[DB] Erro ao fazer parse do JSON. Arquivo pode estar corrompido:', parseError.message);
                console.warn('[DB] Criando backup e inicializando DB vazio.');
                
                // Tenta fazer backup do arquivo corrompido
                try {
                    const backupPath = `${this.dbPath}.backup.${Date.now()}`;
                    await fs.copyFile(this.dbPath, backupPath);
                    console.log(`[DB] Backup criado em: ${backupPath}`);
                } catch (backupError) {
                    console.error('[DB] Erro ao criar backup:', backupError);
                }
                
                // Cria DB vazio
                const emptyDb: DB = { groups: {} };
                await this.enqueueWrite(() => this.saveDbInternal(emptyDb));
                return emptyDb;
            }

            const db = this.deserializeDates(parsed) as DB;
            
            // Valida estrutura básica do DB
            if (!db || typeof db !== 'object' || !db.groups) {
                console.warn('[DB] Estrutura do DB inválida. Reinicializando.');
                const emptyDb: DB = { groups: {} };
                await this.enqueueWrite(() => this.saveDbInternal(emptyDb));
                return emptyDb;
            }
            
            // Armazena no cache
            this.cache.set({ key: 'db', value: db, ttlMs: this.CACHE_TTL_MS });
            
            return db;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Arquivo não existe, retorna DB vazio
                console.log('[DB] Arquivo db.json não encontrado. Criando DB vazio.');
                const emptyDb: DB = { groups: {} };
                await this.enqueueWrite(() => this.saveDbInternal(emptyDb));
                return emptyDb;
            }
            
            // Outros erros de leitura
            console.error('[DB] Erro ao ler arquivo db.json:', error);
            console.warn('[DB] Tentando criar DB vazio como fallback.');
            const emptyDb: DB = { groups: {} };
            try {
                await this.enqueueWrite(() => this.saveDbInternal(emptyDb));
            } catch (writeError) {
                console.error('[DB] Erro ao criar DB vazio:', writeError);
            }
            return emptyDb;
        }
    }

    /**
     * Enfileira uma operação de escrita para garantir serialização
     * Previne race conditions ao garantir que apenas uma escrita aconteça por vez
     */
    private async enqueueWrite(operation: WriteOperation): Promise<void> {
        // Adiciona a operação à fila e aguarda sua execução
        this.writeQueue = this.writeQueue.then(async () => {
            if (this.isWriting) {
                // Se já está escrevendo, aguarda um pouco antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            this.isWriting = true;
            try {
                await operation();
            } finally {
                this.isWriting = false;
            }
        }).catch((error) => {
            this.isWriting = false;
            throw error;
        });
        
        return this.writeQueue;
    }

    /**
     * Salva o banco de dados no arquivo JSON (método interno)
     * Deve ser chamado através de enqueueWrite para garantir thread-safety
     */
    private async saveDbInternal(db: DB): Promise<void> {
        // Cria uma cópia profunda para evitar mutações durante a escrita
        const dbCopy = JSON.parse(JSON.stringify(db)) as DB;
        
        await fs.writeFile(this.dbPath, JSON.stringify(dbCopy, null, 2), 'utf-8');
        
        // Atualiza cache com a cópia
        this.cache.set({ key: 'db', value: dbCopy, ttlMs: this.CACHE_TTL_MS });
    }

    /**
     * Salva o banco de dados no arquivo JSON (método público thread-safe)
     */
    private async saveDb(db: DB): Promise<void> {
        return this.enqueueWrite(() => this.saveDbInternal(db));
    }

    /**
     * Invalida o cache do DB (útil após operações de escrita)
     */
    private invalidateCache(): void {
        this.cache.delete('db');
    }

    /**
     * Implementa debounce para saveMember quando o membro já existe
     * Evita múltiplas escritas desnecessárias do mesmo membro em pouco tempo
     */
    private saveMemberDebounced(groupId: string, member: Member): void {
        const key = `${groupId}:${member.id}`;
        
        // Cancela timer anterior se existir
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        // Cria novo timer
        const timer = setTimeout(async () => {
            this.debounceTimers.delete(key);
            await this.saveMember(groupId, member);
        }, this.DEBOUNCE_MS);
        
        this.debounceTimers.set(key, timer);
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
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async saveGroup(group: Group): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            db.groups[group.id] = group;
            await this.saveDbInternal(db);
        });
    }

    /**
     * Remove um grupo
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async deleteGroup(groupId: string): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            delete db.groups[groupId];
            await this.saveDbInternal(db);
        });
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
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async saveMember(groupId: string, member: Member): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            
            if (!db.groups[groupId]) {
                console.error(`Group ${groupId} not found`);
            }

            db.groups[groupId].members[member.id] = member;
            await this.saveDbInternal(db);
        });
    }

    /**
     * Remove um membro de um grupo
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async deleteMember(groupId: string, memberId: string): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            
            if (db.groups[groupId]?.members[memberId]) {
                delete db.groups[groupId].members[memberId];
                await this.saveDbInternal(db);
            }
        });
    }

    // ========== Operações de Punishment ==========

    /**
     * Cria uma punição para um membro
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async createPunishment(params: CreateAPunishmentParams): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            const group = db.groups[params.groupId];
            
            if (!group) {
                console.error(`Group ${params.groupId} not found`);
            }

            const member = group.members[params.memberId];
            if (!member) {
                console.error(`Member ${params.memberId} not found in group ${params.groupId}`);
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

            await this.saveDbInternal(db);
        });
    }

    /**
     * Remove a punição atual de um membro
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async removeCurrentPunishment(groupId: string, memberId: string): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            const member = db.groups[groupId]?.members[memberId];
            
            if (member) {
                delete member.currentPunishment;
                await this.saveDbInternal(db);
            }
        });
    }

    /**
     * Incrementa o número de mensagens de um membro
     * Thread-safe: usa fila de escrita para evitar race conditions
     */
    async incrementMemberMessages(groupId: string, memberId: string, messageId: string): Promise<void> {
        return this.enqueueWrite(async () => {
            const db = await this.loadDb();
            const member = db.groups[groupId]?.members[memberId];
            
            if (member) {
                member.numberOfMessages = (member.numberOfMessages || 0) + 1;
                if (!member.menssagesIds) {
                    member.menssagesIds = [];
                }
                member.menssagesIds.push(messageId);
                await this.saveDbInternal(db);
            }
        });
    }

    async getMemberName(groupId: string, memberId: string): Promise<string> {
        const member = await this.getMember(groupId, memberId);
        return member?.name || '[FULANO(A)]';
    }
}

