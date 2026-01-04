# WhatsApp Group Bot V2

Projeto Node.js com TypeScript e hot reload.

## 🚀 Como usar

### Instalação

```bash
npm install
```

### Desenvolvimento (com hot reload)

```bash
npm run dev
```

O servidor irá reiniciar automaticamente a cada save de arquivo.

### Build

```bash
npm run build
```

### Executar produção

```bash
npm start
```

### Verificar tipos TypeScript

```bash
npm run type-check
```

## 📁 Estrutura do Projeto

```
.
├── src/
│   ├── eventBus/        # EventBus reativo
│   ├── types/           # Tipos TypeScript
│   ├── examples/        # Exemplos de uso
│   └── ...
├── dist/                # Código compilado (gerado automaticamente)
├── package.json
└── tsconfig.json
```

## 🔧 Tecnologias

- Node.js
- TypeScript
- ts-node-dev (hot reload)
- RxJS (arquitetura reativa)
- whatsapp-web.js

## 📡 EventBus - Arquitetura Reativa

O projeto utiliza um EventBus baseado em RxJS para comunicação reativa entre componentes.

### Uso Básico

```typescript
import eventBus from './eventBus';
import { DomainEventType, MemberMessageSentPayload } from './types/domainEvents';

// Emitir um evento
eventBus.emit<MemberMessageSentPayload>({
  type: DomainEventType.MEMBER_MESSAGE_SENT,
  payload: {
    groupId: '123',
    memberId: '456',
    name: 'João',
    isAdmin: false,
    message: msg
  },
  metadata: {
    groupId: '123',
    userId: '456'
  }
});

// Escutar eventos específicos
eventBus
  .onEvent<MemberMessageSentPayload>(DomainEventType.MEMBER_MESSAGE_SENT)
  .subscribe((event) => {
    console.log(event.payload.groupId);
  });
```

Veja mais exemplos em `src/examples/eventBusExample.ts`

