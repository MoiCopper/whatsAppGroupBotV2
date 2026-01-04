import { promises as fs } from 'fs';
import { join } from 'path';
import { DB } from '../types/db.interface';
import DbRepository from './DbRepository';

/**
 * Inicializa o banco de dados
 * Cria o arquivo db.json se não existir
 */
export async function initDb(dbPath?: string): Promise<DbRepository> {
    const path = dbPath || join(process.cwd(), 'db.json');
    
    try {
        // Tenta ler o arquivo para verificar se existe
        await fs.access(path);
        console.log('[DB] Arquivo db.json encontrado');
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // Arquivo não existe, cria um DB vazio
            const emptyDb: DB = { groups: {} };
            await fs.writeFile(path, JSON.stringify(emptyDb, null, 2), 'utf-8');
            console.log('[DB] Arquivo db.json criado');
        } else {
            throw error;
        }
    }

    // Cria e retorna instância do repositório
    const repository = new DbRepository(path);
    
    // Testa carregar o DB para garantir que está funcionando
    await repository.getAllGroups();
    console.log('[DB] Repositório inicializado com sucesso');
    
    return repository;
}

/**
 * Cria uma instância do DbRepository (assume que o DB já foi inicializado)
 */
export function createDbRepository(dbPath?: string): DbRepository {
    return new DbRepository(dbPath);
}

