import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DomainEventType } from '../types/domainEvents';
import eventBus from '../../eventBus';
import { createDatabasePool } from './dbConfig';

/**
 * Inicializa o banco de dados e testa a conexão
 */
export async function initDb(): Promise<void> {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL não está definida nas variáveis de ambiente. Crie um arquivo .env com DATABASE_URL.');
    }

    // Cria o pool de conexões do PostgreSQL com configuração SSL adequada
    const poolConfig = createDatabasePool(process.env.DATABASE_URL);
    const pool = new Pool(poolConfig);

    // Cria o adapter do PostgreSQL
    const adapter = new PrismaPg(pool);

    // Inicializa o PrismaClient com o adapter
    const prisma = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'dev' ? ['query'] : []
    });

    try {
        // Testa a conexão com o banco
        await prisma.$connect();
        console.log('[DB] Conectado ao banco de dados PostgreSQL');

        // Testa uma query simples
        await prisma.$queryRaw`SELECT 1`;
        console.log('[DB] Conexão com banco de dados verificada');
    } catch (error) {
        console.error('[DB] Erro ao conectar ao banco de dados:', error);
        throw error;
    }

    eventBus.emit({
        type: DomainEventType.DATABASE_CONNECTED,
        payload: {
            prismaClient: prisma
        }
    });
}
