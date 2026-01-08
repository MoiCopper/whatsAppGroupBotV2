import eventBus from '../../eventBus';
import { DomainEvent, DomainEventType, ErrorOccurredPayload } from '../types/domainEvents';

/**
 * Configurações do ErrorHandler
 */
export interface ErrorHandlerConfig {
    /**
     * Se true, a aplicação será encerrada em erros críticos
     * @default false (em produção, considere true para erros críticos)
     */
    exitOnCriticalError?: boolean;
    
    /**
     * Se true, loga erros no console
     * @default true
     */
    logErrors?: boolean;
    
    /**
     * Se true, emite eventos de erro através do EventBus
     * @default true
     */
    emitErrorEvents?: boolean;
    
    /**
     * Callback customizado para tratamento de erros
     */
    onError?: (error: Error, context?: string) => void;
}

/**
 * Error Handler Global
 * Captura e trata erros não tratados da aplicação
 */
export class ErrorHandler {
    private config: Required<ErrorHandlerConfig>;
    private errorCount = 0;
    private readonly MAX_ERRORS_PER_MINUTE = 10;

    constructor(config: ErrorHandlerConfig = {}) {
        this.config = {
            exitOnCriticalError: config.exitOnCriticalError ?? false,
            logErrors: config.logErrors ?? true,
            emitErrorEvents: config.emitErrorEvents ?? true,
            onError: config.onError ?? (() => {})
        };

        this.setupGlobalHandlers();
    }

    /**
     * Configura os handlers globais de erro
     */
    private setupGlobalHandlers(): void {
        // Captura erros síncronos não tratados
        process.on('uncaughtException', (error: Error) => {
            this.handleError(error, 'uncaughtException');
        });

        // Captura rejeições de promises não tratadas
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            const error = reason instanceof Error 
                ? reason 
                : new Error(`Unhandled Rejection: ${String(reason)}`);
            
            // Adiciona contexto sobre a promise rejeitada
            error.stack = error.stack || `Promise rejection: ${String(reason)}`;
            
            this.handleError(error, 'unhandledRejection', {
                promise: promise.toString(),
                reason: String(reason)
            });
        });

        // Captura warnings (opcional, mas útil para debug)
        process.on('warning', (warning: Error) => {
            if (this.config.logErrors) {
                console.warn('[ErrorHandler] Warning:', warning.message);
                if (warning.stack) {
                    console.warn(warning.stack);
                }
            }
        });
    }

    /**
     * Trata um erro
     */
    private handleError(
        error: Error, 
        context: string, 
        metadata?: Record<string, any>
    ): void {
        this.errorCount++;

        // Previne spam de erros
        if (this.errorCount > this.MAX_ERRORS_PER_MINUTE) {
            if (this.config.logErrors) {
                console.error('[ErrorHandler] Muitos erros detectados. Limitando logs.');
            }
            return;
        }

        // Reset contador após 1 minuto
        setTimeout(() => {
            this.errorCount = Math.max(0, this.errorCount - 1);
        }, 60000);

        const errorPayload: ErrorOccurredPayload = {
            error,
            context,
            metadata: {
                ...metadata,
                errorCount: this.errorCount
            },
            fatal: this.isCriticalError(error)
        };

        // Log do erro
        if (this.config.logErrors) {
            this.logError(error, context, metadata);
        }

        // Emite evento de erro através do EventBus
        if (this.config.emitErrorEvents) {
            try {
                eventBus.emit<ErrorOccurredPayload>({
                    type: DomainEventType.ERROR_OCCURRED,
                    payload: errorPayload,
                    metadata: {
                        context,
                        timestamp: Date.now(),
                        ...metadata
                    }
                });
            } catch (eventError) {
                // Se falhar ao emitir evento, loga mas não quebra
                console.error('[ErrorHandler] Erro ao emitir evento de erro:', eventError);
            }
        }

        // Callback customizado
        try {
            this.config.onError(error, context);
        } catch (callbackError) {
            console.error('[ErrorHandler] Erro no callback customizado:', callbackError);
        }

        // Decide se deve encerrar a aplicação
        if (this.config.exitOnCriticalError && this.isCriticalError(error)) {
            console.error('[ErrorHandler] Erro crítico detectado. Encerrando aplicação...');
            process.exit(1);
        }
    }

    /**
     * Loga o erro de forma formatada
     */
    private logError(error: Error, context: string, metadata?: Record<string, any>): void {
        const timestamp = new Date().toISOString();
        const separator = '='.repeat(80);
        
        console.error(`\n${separator}`);
        console.error(`[ErrorHandler] ${timestamp}`);
        console.error(`Contexto: ${context}`);
        console.error(`Erro: ${error.name}`);
        console.error(`Mensagem: ${error.message}`);
        
        if (metadata && Object.keys(metadata).length > 0) {
            console.error('Metadata:', JSON.stringify(metadata, null, 2));
        }
        
        if (error.stack) {
            console.error('Stack Trace:');
            console.error(error.stack);
        }
        
        console.error(separator + '\n');
    }

    /**
     * Verifica se o erro é crítico e deve encerrar a aplicação
     */
    private isCriticalError(error: Error): boolean {
        // Erros críticos que geralmente indicam problemas graves
        const criticalErrors = [
            'EADDRINUSE',      // Porta já em uso
            'ECONNREFUSED',    // Conexão recusada (banco de dados)
            'ENOTFOUND',       // DNS não encontrado
            'ETIMEDOUT',       // Timeout de conexão
            'MODULE_NOT_FOUND' // Módulo não encontrado
        ];

        return criticalErrors.some(critical => 
            error.message.includes(critical) || 
            error.name.includes(critical)
        );
    }

    /**
     * Método público para tratar erros manualmente
     */
    public handle(error: Error, context?: string, metadata?: Record<string, any>): void {
        this.handleError(error, context || 'manual', metadata);
    }

    /**
     * Wrapper para async functions que captura erros automaticamente
     */
    public wrapAsync<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        context?: string
    ): T {
        return (async (...args: any[]) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(
                    error instanceof Error ? error : new Error(String(error)),
                    context || fn.name || 'async function',
                    { args: args.length }
                );
                throw error; // Re-throw para manter comportamento original
            }
        }) as T;
    }

    /**
     * Wrapper para sync functions que captura erros automaticamente
     */
    public wrapSync<T extends (...args: any[]) => any>(
        fn: T,
        context?: string
    ): T {
        return ((...args: any[]) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleError(
                    error instanceof Error ? error : new Error(String(error)),
                    context || fn.name || 'sync function',
                    { args: args.length }
                );
                throw error; // Re-throw para manter comportamento original
            }
        }) as T;
    }
}

/**
 * Instância singleton do ErrorHandler
 */
let errorHandlerInstance: ErrorHandler | null = null;

/**
 * Inicializa o ErrorHandler global
 */
export function initializeErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
    if (!errorHandlerInstance) {
        errorHandlerInstance = new ErrorHandler(config);
    }
    return errorHandlerInstance;
}

/**
 * Obtém a instância do ErrorHandler
 */
export function getErrorHandler(): ErrorHandler {
    if (!errorHandlerInstance) {
        throw new Error('ErrorHandler não foi inicializado. Chame initializeErrorHandler() primeiro.');
    }
    return errorHandlerInstance;
}

export default ErrorHandler;

