import DbRepository from './DbRepository';

/**
 * Instância singleton do DbRepository
 * Use esta instância em toda a aplicação
 */
const dbRepository = new DbRepository();

export default dbRepository;
export { DbRepository };
export * from './initDb';

