import { Client, LocalAuth } from 'whatsapp-web.js';

export default class WhatsAppClient {
    private client: Client;

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true, args: ["--no-sandbox"] },
        });
        this.initialize();
    }

    public async initialize() {
        this.client.initialize().then(() => {
            console.log('[WhatsAppClient] Client initialized');
        }).catch((err) => {
            console.error(err);
        });
    }

    public getClient():Client {
        return this.client;
    }
}