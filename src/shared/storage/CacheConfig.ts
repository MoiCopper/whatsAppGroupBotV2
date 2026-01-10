/**
 * Configurações de cache para os repositórios
 * TTLs em milissegundos
 */
export const CACHE_TTL = {
    // Cache de grupos - dados raramente mudam
    GROUP: 5 * 60 * 1000, // 5 minutos

    // Cache de membros - podem mudar com mais frequência
    MEMBER: 2 * 60 * 1000, // 2 minutos

    // Cache de ChatGroups - relação entre grupo e membro
    CHAT_GROUP: 3 * 60 * 1000, // 3 minutos

    // Cache de punições - dados que mudam frequentemente
    PUNISHMENT: 30 * 1000, // 30 segundos

    // Cache de blacklist - dados que raramente mudam
    BLACKLIST: 10 * 60 * 1000, // 10 minutos
} as const;

/**
 * Prefixos para chaves de cache
 */
export const CACHE_KEYS = {
    GROUP: (whatsAppGroupId: string) => `group:${whatsAppGroupId}`,
    MEMBER: (whatsAppMemberId: string) => `member:${whatsAppMemberId}`,
    CHAT_GROUP: (groupId: string, memberId: string) => `chatgroup:${groupId}:${memberId}`,
    PUNISHMENT: (whatsAppMemberId: string) => `punishment:${whatsAppMemberId}`,
    BLACKLIST: (memberId: string) => `blacklist:${memberId}`,
} as const;

