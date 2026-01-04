import WhatsAppClient from './modules/whatsApp/WhatsAppClient';
import WhatsAppEventsHandler from './modules/whatsApp/WhatsAppEventsHandler';
import WhatsAppRepository from './modules/whatsApp/WhatsAppRepository';
import Cache from './shared/utils/Cache';
import { RegisterGroupCommand } from './modules/bot/commands/RegisterGroup';
import { CdmCommandHandler } from './modules/bot/cdm';
import CheckUserPunishment from './modules/user/CheckUserPunishment';
import { TimeoutCommand } from './modules/bot/commands/Timeout';
import { WhatsAppMessageSender } from './modules/whatsApp/WhatsAppMessageSender';
import { SetFreeCommand } from './modules/bot/commands/SetFree';
import { PingCommand } from './modules/bot/commands/Ping';
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

new WhatsAppMessageSender(clientInstance);
new RegisterGroupCommand();
new CdmCommandHandler();
new CheckUserPunishment();
new TimeoutCommand();
new SetFreeCommand();
new PingCommand();