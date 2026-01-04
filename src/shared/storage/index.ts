import DbRepository from './DbRepository';

/**
 * Instância singleton do DbRepository
 * Use esta instância em toda a aplicação
 * 
 * IMPORTANTE: O arquivo db.json será criado automaticamente se não existir
 * na primeira operação de leitura/escrita através do método loadDb().
 */
const dbRepository = new DbRepository();

export default dbRepository;
export { DbRepository };
export * from './initDb';

