import { PoolConfig } from 'pg';

/**
 * Tipos de configuração SSL suportados
 */
export type SSLMode = 'require' | 'prefer' | 'disable' | 'verify-full' | 'verify-ca';

/**
 * Interface para configuração SSL
 */
export interface SSLConfig {
    rejectUnauthorized?: boolean;
    ca?: string | Buffer;
    cert?: string | Buffer;
    key?: string | Buffer;
}

/**
 * Extrai o modo SSL da URL do banco de dados
 */
function extractSSLModeFromURL(url: string): SSLMode | null {
    try {
        const urlObj = new URL(url);
        const sslmode = urlObj.searchParams.get('sslmode');
        if (sslmode && ['require', 'prefer', 'disable', 'verify-full', 'verify-ca'].includes(sslmode)) {
            return sslmode as SSLMode;
        }
    } catch {
        // Se não conseguir parsear a URL, retorna null
    }
    return null;
}

/**
 * Detecta se a conexão é local (localhost, 127.0.0.1, ou IP privado)
 */
function isLocalConnection(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname.startsWith('172.17.') ||
            hostname.startsWith('172.18.') ||
            hostname.startsWith('172.19.') ||
            hostname.startsWith('172.20.') ||
            hostname.startsWith('172.21.') ||
            hostname.startsWith('172.22.') ||
            hostname.startsWith('172.23.') ||
            hostname.startsWith('172.24.') ||
            hostname.startsWith('172.25.') ||
            hostname.startsWith('172.26.') ||
            hostname.startsWith('172.27.') ||
            hostname.startsWith('172.28.') ||
            hostname.startsWith('172.29.') ||
            hostname.startsWith('172.30.') ||
            hostname.startsWith('172.31.')
        );
    } catch {
        return false;
    }
}

/**
 * Configura SSL para conexão PostgreSQL
 * 
 * Prioridade de configuração:
 * 1. Variável de ambiente DATABASE_SSL_MODE
 * 2. Parâmetro sslmode na URL
 * 3. Detecção automática baseada no ambiente e tipo de conexão
 */
export function configureSSL(url: string): SSLConfig | false {
    // 1. Verifica variável de ambiente explícita
    const envSSLMode = process.env.DATABASE_SSL_MODE as SSLMode | undefined;
    if (envSSLMode) {
        return getSSLConfig(envSSLMode);
    }

    // 2. Verifica parâmetro na URL
    const urlSSLMode = extractSSLModeFromURL(url);
    if (urlSSLMode) {
        return getSSLConfig(urlSSLMode);
    }

    // 3. Detecção automática
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocal = isLocalConnection(url);

    // Em produção com conexão remota, SSL é obrigatório
    if (isProduction && !isLocal) {
        return getSSLConfig('require');
    }

    // Em desenvolvimento local, SSL é opcional
    if (!isProduction && isLocal) {
        return false; // Desabilita SSL para conexões locais em desenvolvimento
    }

    // Para conexões remotas em desenvolvimento, tenta SSL mas não falha se não disponível
    if (!isProduction && !isLocal) {
        return getSSLConfig('prefer');
    }

    // Padrão: não usar SSL
    return false;
}

/**
 * Retorna configuração SSL baseada no modo
 */
function getSSLConfig(mode: SSLMode): SSLConfig | false {
    switch (mode) {
        case 'disable':
            return false;

        case 'prefer':
            // Tenta SSL mas não falha se não disponível
            return { rejectUnauthorized: false };

        case 'require':
            // Exige SSL mas aceita certificados auto-assinados (útil para desenvolvimento)
            return { rejectUnauthorized: false };

        case 'verify-ca':
            // Verifica o certificado CA mas não o hostname
            const ca = process.env.DATABASE_CA_CERT;
            if (!ca) {
                console.warn('[DB] DATABASE_CA_CERT não definido para modo verify-ca. Usando rejectUnauthorized: false');
                return { rejectUnauthorized: false };
            }
            return {
                rejectUnauthorized: true,
                ca: Buffer.from(ca, 'base64')
            };

        case 'verify-full':
            // Verifica certificado CA e hostname (mais seguro)
            const caFull = process.env.DATABASE_CA_CERT;
            const cert = process.env.DATABASE_CLIENT_CERT;
            const key = process.env.DATABASE_CLIENT_KEY;

            if (!caFull) {
                console.warn('[DB] DATABASE_CA_CERT não definido para modo verify-full. Usando rejectUnauthorized: false');
                return { rejectUnauthorized: false };
            }

            const config: SSLConfig = {
                rejectUnauthorized: true,
                ca: Buffer.from(caFull, 'base64')
            };

            if (cert) {
                config.cert = Buffer.from(cert, 'base64');
            }

            if (key) {
                config.key = Buffer.from(key, 'base64');
            }

            return config;

        default:
            return false;
    }
}

/**
 * Configura o Pool do PostgreSQL com SSL adequado
 */
export function createDatabasePool(url: string): PoolConfig {
    const sslConfig = configureSSL(url);

    const poolConfig: PoolConfig = {
        connectionString: url
    };

    if (sslConfig !== false) {
        poolConfig.ssl = sslConfig;

        const mode = process.env.DATABASE_SSL_MODE || extractSSLModeFromURL(url) || 'auto';
        console.log(`[DB] SSL configurado: ${mode}`, sslConfig.rejectUnauthorized ? '(verificação ativa)' : '(sem verificação)');
    } else {
        console.log('[DB] SSL desabilitado');
    }

    return poolConfig;
}

