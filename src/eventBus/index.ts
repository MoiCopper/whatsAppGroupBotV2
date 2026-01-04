import EventBus from './EventBus';

/**
 * Instância singleton do EventBus
 * Use esta instância em toda a aplicação
 */
const eventBus = new EventBus();

export default eventBus;
export { EventBus };

