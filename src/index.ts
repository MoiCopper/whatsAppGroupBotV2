import WhatsAppClient from './modules/whatsApp/WhatsAppClient';
import WhatsAppEventsHandler from './modules/whatsApp/WhatsAppEventsHandler';
import WhatsAppRepository from './modules/whatsApp/WhatsAppRepository';
import Cache from './utils/Cache';
console.log('🚀 Starting WhatsApp Group Bot V2');
// Exemplo de servidor simples
const PORT = process.env.PORT || 3000;

console.log(`Server running on port ${PORT}`);
const client = new WhatsAppClient();
const clientInstance = client.getClient();

const cache = new Cache<any>();
const whatsAppRepository = new WhatsAppRepository(clientInstance, cache);
const eventsHandler = new WhatsAppEventsHandler(clientInstance, whatsAppRepository);
eventsHandler.registerEvents();
