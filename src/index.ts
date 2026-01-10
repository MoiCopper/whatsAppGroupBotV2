// Carrega variáveis de ambiente PRIMEIRO
import 'dotenv/config';

// Inicializa Error Handler GLOBAL ANTES de qualquer outra coisa
import { initializeErrorHandler } from './shared/error/ErrorHandler';
initializeErrorHandler({
    exitOnCriticalError: process.env.NODE_ENV === 'production',
    logErrors: true,
    emitErrorEvents: true
});

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
import { initDb } from './shared/storage';
import { ExpressServer } from './server/expressServer';
import PersistUserData from './modules/user/PersistUserData';
import { AllCommands } from './modules/bot/commands/all';

console.log('🚀 Starting WhatsApp Group Bot V2');

// Inicializa o banco de dados ANTES de qualquer outra coisa
(async () => {
    try {
        await initDb();
        console.log('[DB] Banco de dados inicializado');

        // Agora pode inicializar o resto da aplicação
        startApplication();
    } catch (error) {
        console.error('[DB] Erro ao inicializar banco de dados:', error);
        process.exit(1);
    }
})();

function startApplication() {

    // Configuração do servidor Express
    const PORT = process.env.PORT || 3000;
    const expressServer = new ExpressServer(Number(PORT));

    // Inicializa o cliente WhatsApp
    const client = new WhatsAppClient();
    const clientInstance = client.getClient();

    const cache = new Cache<any>();
    const whatsAppRepository = new WhatsAppRepository(clientInstance, cache);
    const eventsHandler = new WhatsAppEventsHandler(clientInstance, whatsAppRepository);

    // Conecta o eventsHandler ao servidor Express para acessar o QR code
    expressServer.setEventsHandler(eventsHandler);

    // Inicia o servidor Express
    expressServer.start();

    // Registra os eventos do WhatsApp
    eventsHandler.registerEvents();

    new WhatsAppMessageSender(clientInstance);
    new RegisterGroupCommand();
    new CdmCommandHandler();
    new CheckUserPunishment();
    new TimeoutCommand();
    new SetFreeCommand();
    new PingCommand();
    new PersistUserData();
    new AllCommands();
}