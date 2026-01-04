import express, { Request, Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';
import WhatsAppEventsHandler from '../modules/whatsApp/WhatsAppEventsHandler';

export class ExpressServer {
    private app: express.Application;
    private port: number;
    private eventsHandler: WhatsAppEventsHandler | null = null;
    private templatesPath: string;

    constructor(port: number = 3000) {
        this.app = express();
        this.port = port;
        // Define o caminho dos templates
        // Tenta múltiplos caminhos possíveis para funcionar em diferentes ambientes
        const possiblePaths = [
            // Em produção: dist/server/templates (se não bundlado)
            join(__dirname, 'templates'),
            // Em produção: dist/server/templates (se bundlado, __dirname pode ser dist/)
            join(__dirname, 'server', 'templates'),
            // Em desenvolvimento: src/server/templates
            join(process.cwd(), 'src', 'server', 'templates'),
            // Fallback: dist/server/templates (usando process.cwd)
            join(process.cwd(), 'dist', 'server', 'templates'),
        ];
        
        // Encontra o primeiro caminho que existe
        let foundPath: string | null = null;
        for (const path of possiblePaths) {
            if (existsSync(path)) {
                foundPath = path;
                console.log(`[ExpressServer] Templates encontrados em: ${path}`);
                break;
            }
        }
        
        // Define o caminho encontrado ou usa o fallback
        this.templatesPath = foundPath || possiblePaths[possiblePaths.length - 1];
        if (!foundPath) {
            console.warn(`[ExpressServer] Templates não encontrados, usando: ${this.templatesPath}`);
        }
        
        this.setupRoutes();
    }

    /**
     * Define o handler de eventos do WhatsApp para acessar o QR code
     */
    public setEventsHandler(eventsHandler: WhatsAppEventsHandler): void {
        this.eventsHandler = eventsHandler;
    }

    /**
     * Configura as rotas do servidor
     */
    private setupRoutes(): void {
        // Rota principal - exibe o QR code
        this.app.get('/', async (req: Request, res: Response) => {
            try {
                const isReady = this.eventsHandler?.getIsReady();
                
                // Se já está conectado, mostra mensagem de sucesso
                if (isReady) {
                    return res.send(this.getConnectedTemplate());
                }

                const qrCode = this.eventsHandler?.getQrCode();
                
                if (!qrCode) {
                    return res.send(this.getNoQrCodeTemplate());
                }

                // Gera o QR code como data URL (imagem base64)
                const qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
                    width: 400,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                res.send(this.getQrCodeTemplate(qrCodeDataUrl));
            } catch (error) {
                console.error('[ExpressServer] Erro ao gerar QR code:', error);
                res.status(500).send(this.getErrorTemplate());
            }
        });

        // Rota para obter apenas o QR code como JSON
        this.app.get('/api/qrcode', async (req: Request, res: Response) => {
            try {
                const qrCode = this.eventsHandler?.getQrCode();
                
                if (!qrCode) {
                    return res.json({ 
                        success: false, 
                        message: 'QR code ainda não foi gerado' 
                    });
                }

                const qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
                    width: 400,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                res.json({ 
                    success: true, 
                    qrCode: qrCodeDataUrl,
                    raw: qrCode
                });
            } catch (error) {
                console.error('[ExpressServer] Erro ao gerar QR code:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao gerar QR code' 
                });
            }
        });

        // Rota de health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                hasQrCode: !!this.eventsHandler?.getQrCode()
            });
        });
    }

    /**
     * Carrega e processa template HTML com QR code
     */
    private getQrCodeTemplate(qrCodeDataUrl: string): string {
        try {
            const template = readFileSync(join(this.templatesPath, 'qrcode.html'), 'utf-8');
            return template.replace('{{QR_CODE}}', qrCodeDataUrl);
        } catch (error) {
            console.error('[ExpressServer] Erro ao carregar template qrcode.html:', error);
            return this.getErrorTemplate();
        }
    }

    /**
     * Carrega template HTML quando não há QR code disponível
     */
    private getNoQrCodeTemplate(): string {
        try {
            return readFileSync(join(this.templatesPath, 'waiting.html'), 'utf-8');
        } catch (error) {
            console.error('[ExpressServer] Erro ao carregar template waiting.html:', error);
            return '<html><body><h1>Erro ao carregar template</h1></body></html>';
        }
    }

    /**
     * Carrega template HTML quando já está conectado
     */
    private getConnectedTemplate(): string {
        try {
            return readFileSync(join(this.templatesPath, 'connected.html'), 'utf-8');
        } catch (error) {
            console.error('[ExpressServer] Erro ao carregar template connected.html:', error);
            return '<html><body><h1>Conectado com Sucesso!</h1></body></html>';
        }
    }

    /**
     * Carrega template HTML para erro
     */
    private getErrorTemplate(): string {
        try {
            return readFileSync(join(this.templatesPath, 'error.html'), 'utf-8');
        } catch (error) {
            console.error('[ExpressServer] Erro ao carregar template error.html:', error);
            return '<html><body><h1>Erro ao carregar template</h1></body></html>';
        }
    }

    /**
     * Inicia o servidor Express
     */
    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`[ExpressServer] Servidor rodando na porta ${this.port}`);
            console.log(`[ExpressServer] Acesse http://localhost:${this.port} para ver o QR Code`);
        });
    }
}

