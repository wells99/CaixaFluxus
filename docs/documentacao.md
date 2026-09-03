# Documentação do Projeto: Sistema PDV Desktop (Local-First)

---

## 1. Visão Geral e Arquitetura do Sistema

### 1.1 Objetivo
Desenvolver um aplicativo de **Ponto de Venda (PDV)** desktop para ambiente Windows, com suporte a controle de caixa, vendas offline, gestão de estoque e sincronização em nuvem. O projeto visa atender múltiplos clientes de pequeno e médio porte com autonomia total contra instabilidades de internet.

### 1.2 Conceito Local-First
* **Operação Primária:** Todas as transações (abertura de caixa, adição de itens, fechamento de vendas e atualização de estoque local) ocorrem diretamente na máquina do cliente utilizando **SQLite** com **Prisma ORM**.
* **Sincronização Assíncrona:** Um motor de background no Electron (`SyncEngine`) verifica periodicamente a conectividade e envia registros da fila local (`sync_queue`) para a **API Cloud (MySQL)**.

### 1.3 Diagrama de Arquitetura

```
+-----------------------------------------------------------------------+
| CLIENTE WINDOWS (App Electron Desktop)                                |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Processo Renderer (Interface do Usuário)                        |  |
|  | React 19 + Vite + Tailwind CSS + Shadcn/UI                       |  |
|  +--------------------------------▲--------------------------------+  |
|                                   | IPC (ContextBridge via Preload)   |
|  +--------------------------------▼--------------------------------+  |
|  | Processo Main (Node.js Backend Local)                           |  |
|  |                                                                 |  |
|  |  +---------------------+  +-----------------+  +--------------+ |  |
|  |  | IPC Handlers        |  | Sync Engine     |  | Hardware     | |  |
|  |  | (Controllers)       |  | (Worker Queue)  |  | (ESC/POS/HID)| |  |
|  |  +----------┬----------+  +--------┬--------+  +--------------+ |  |
|  |             │                      │                           |  |
|  |  +----------▼----------------------▼--------+                  |  |
|  |  | Services & Repositories (Prisma Client)  |                  |  |
|  |  +---------------------+--------------------+                  |  |
|  |                        │                                       |  |
|  |  +---------------------▼--------------------+                  |  |
|  |  | Banco de Dados Local: SQLite             |                  |  |
|  |  +------------------------------------------+                  |  |
|  +--------------------------------┬--------------------------------+  |
+-----------------------------------|-----------------------------------+
                                    | HTTPS / REST JSON
                                    | (Sincronização Assíncrona)
                                    v
+-----------------------------------------------------------------------+
| NUVEM / SERVER (API Cloud Multi-tenant)                               |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Node.js / Fastify API (Layered Architecture)                    |  |
|  | Controller -> Service -> Repository (Prisma Client MySQL)       |  |
|  +--------------------------------┬--------------------------------+  |
|                                   │                                   |
|  +--------------------------------▼--------------------------------+  |
|  | Hospedagem Compartilhada: MySQL (Bancos Isolados por Cliente)   |  |
|  | (ex: pdv_cliente_1, pdv_cliente_2)                                |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

## 2. Estrutura de Pastas e Monorepo

O projeto é estruturado como um **Monorepo** para compartilhamento de tipagens TypeScript e validações Zod entre o Desktop e a API Cloud.

```
pdv-monorepo/
├── package.json                   # Configuração de workspaces
├── pnpm-workspace.yaml            # Definição dos pacotes
├── apps/
│   ├── desktop/                   # App Electron + React
│   │   ├── package.json
│   │   ├── electron-builder.json  # Build para .exe Windows
│   │   ├── vite.config.ts         # Configuração do Vite/React
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Schema SQLite local
│   │   └── src/
│   │       ├── main/              # Processo Main (Node.js Local)
│   │       │   ├── index.ts       # Entrypoint do Electron
│   │       │   ├── ipc/           # Handlers de IPC (Controllers locais)
│   │       │   ├── services/      # Regras de negócio (Vendas, Caixa, Estoque)
│   │       │   ├── repositories/  # Acesso ao SQLite via Prisma
│   │       │   ├── sync/          # Motor de sincronização com a nuvem
│   │       │   └── hardware/      # Impressora térmica e leitor
│   │       ├── preload/           # Ponte segura ContextBridge
│   │       │   └── index.ts       # Exposição de APIs do sistema no window.api
│   │       └── renderer/          # Processo Renderer (React UI)
│   │           ├── index.html
│   │           ├── src/
│   │           │   ├── App.tsx
│   │           │   ├── pages/     # Telas (PDV, Caixa, Estoque, Config)
│   │           │   ├── components/# Componentes Shadcn/UI
│   │           │   ├── hooks/     # Custom hooks para chamadas IPC
│   │           │   └── store/     # Estado global (Zustand)
│   │
│   └── api/                       # API Cloud (Servidor REST)
│       ├── package.json
│       ├── prisma/
│       │   └── schema.prisma      # Schema MySQL da Nuvem
│       └── src/
│           ├── server.ts          # Entrypoint Fastify/Express
│           ├── controllers/       # Endpoints REST
│           ├── services/          # Regras de Sincronização & Relatórios
│           ├── repositories/      # Conexão dinâmica Multi-tenant MySQL
│           └── middlewares/       # Auth JWT e identificação de tenant
│
└── packages/
    └── shared/                    # Código Compartilhado
        ├── package.json
        └── src/
            ├── types/             # Interfaces TypeScript (Venda, Produto, Caixa)
            ├── schemas/           # Schemas Zod (Validação de DTOs)
            └── constants/         # Enums (StatusVenda, MetodoPagamento)
```

---

## 3. Guia de Inicialização e Configuração do Projeto

### 3.1 Passos para Inicializar a Estrutura (Monorepo pnpm)

1. **Criar a pasta raiz e configurar o Workspace:**
   ```bash
   mkdir pdv-system && cd pdv-system
   pnpm init
   ```

2. **Criar arquivo `pnpm-workspace.yaml`:**
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **Configuração do App Desktop (`apps/desktop`):**
   * Inicializar projeto com Vite + React + TypeScript no `apps/desktop/src/renderer`.
   * Instalar dependências do Electron e Prisma:
     ```bash
     cd apps/desktop
     pnpm add electron electron-builder -D
     pnpm add @prisma/client
     pnpm add prisma -D
     ```

4. **Configuração do Schema Prisma SQLite (`apps/desktop/prisma/schema.prisma`):**
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }

   model Produto {
     id           String   @id @default(uuid())
     codigoBarras String?  @unique
     nome         String
     precoVenta   Float
     estoque      Int
     updatedAt    DateTime @updatedAt
   }

   model Caixa {
     id          String    @id @default(uuid())
     saldoInicial Float
     saldoFinal   Float?
     status      String    // OPEN, CLOSED
     openedAt    DateTime  @default(now())
     closedAt    DateTime?
     vendas      Venda[]
   }

   model Venda {
     id            String      @id @default(uuid())
     caixaId       String
     caixa         Caixa       @relation(fields: [caixaId], references: [id])
     valorTotal    Float
     metodoPgto    String      // CASH, CARD, PIX
     createdAt     DateTime    @default(now())
     itens         ItemVenda[]
   }

   model ItemVenda {
     id         String  @id @default(uuid())
     vendaId    String
     venda      Venda   @relation(fields: [vendaId], references: [id])
     produtoId  String
     quantidade Int
     precoUnit  Float
   }

   model SyncQueue {
     id        String   @id @default(uuid())
     entity    String   // VENDA, CAIXA, ESTOQUE
     payload   String   // JSON stringified
     status    String   // PENDING, SYNCED, FAILED
     attempts  Int      @default(0)
     createdAt DateTime @default(now())
   }
   ```

5. **Exemplo de Comunicação IPC Segura (Preload / Main / Renderer):**

   * **`src/preload/index.ts`:**
     ```typescript
     import { contextBridge, ipcRenderer } from 'electron';

     contextBridge.exposeInMainWorld('api', {
       vendas: {
         registrar: (dados: any) => ipcRenderer.invoke('venda:registrar', dados),
       },
       caixa: {
         obterStatus: () => ipcRenderer.invoke('caixa:status'),
         abrir: (saldoInicial: number) => ipcRenderer.invoke('caixa:abrir', saldoInicial),
       }
     });
     ```

   * **`src/main/ipc/vendaHandler.ts`:**
     ```typescript
     import { ipcMain } from 'electron';
     import { VendaService } from '../services/VendaService';

     export function registerVendaHandlers() {
       ipcMain.handle('venda:registrar', async (_, payload) => {
         return await VendaService.efetuarVenda(payload);
       });
     }
     ```

---

## 4. Divisão de Tarefas para Equipe (3 Desenvolvedores)

A arquitetura do projeto permite que os 3 desenvolvedores trabalhem de forma paralela e independente após a criação dos contratos de dados (`packages/shared`).

---

### **DEV 1: Frontend & Interface do Usuário (Processo Renderer)**
* **Foco:** UX/UI do caixa, agilidade de navegação e componentes visuais.
* **Tarefas Principais:**
  1. Configurar Tailwind CSS, Shadcn/ui e sistema de temas.
  2. **Tela Principal do PDV (Checkout):**
     * Input rápido com suporte a leitor de código de barras (foco automático).
     * Tabela contendo os itens da venda atual, cálculo automático de subtotal e troco.
     * Mapeamento de Atalhos de Teclado no React (ex: `F1` Buscar Produto, `F5` Finalizar, `ESC` Cancelar).
  3. **Tela de Operação de Caixa:**
     * Modal para Abertura de Caixa (valor inicial).
     * Telas de Sangria e Suprimento.
     * Resumo para Fechamento de Caixa.
  4. **Telas de Gestão:**
     * Cadastro e edição de produtos/estoque.
     * Listagem de histórico de vendas locais.
  5. **Integração:** Conectar telas às chamadas `window.api.*` tipadas.

---

### **DEV 2: Core Desktop, Prisma SQLite Local & Sincronização (Processo Main)**
* **Foco:** Persistência local de alta performance, suporte offline e hardware.
* **Tarefas Principais:**
  1. **Configuração do Prisma Client no Electron Process Main:**
     * Garantir inicialização e conexão com banco SQLite local (`.db` no `%APPDATA%`).
  2. **Camada de Repositórios e Serviços Locais:**
     * Implementar `VendaRepository`, `CaixaRepository`, `ProdutoRepository`.
     * Regras de negócio: Validação de estoque disponível, encerramento de caixa, cálculo de totais.
  3. **IPC Handlers:**
     * Expor métodos do Main para o Preload e registrar listeners com validação Zod.
  4. **Motor de Sincronização Assíncrona (`SyncEngine`):**
     * Gravação na tabela `SyncQueue` durante transações.
     * Worker em background que consome a fila e faz POST/PUT para a API Cloud.
     * Estratégia de re-tentativa (Retry Logic com Exponential Backoff).
  5. **Módulo de Hardware (Opcional/Futuro):**
     * Abstração de impressão ESC/POS via USB/Serial para cupons não fiscais.

---

### **DEV 3: API Cloud Backend, MySQL Multi-tenant & Migração**
* **Foco:** API centralizadora, isolamento por cliente e infraestrutura na nuvem.
* **Tarefas Principais:**
  1. **Servidor Cloud Fastify/Express:**
     * Estrutura em camadas (Controllers, Services, Repositories).
  2. **Multi-tenancy com Hospedagem Compartilhada:**
     * Gerenciador de conexões MySQL que seleciona dinamicamente a base do cliente (`pdv_cliente_X`) com base na chave JWT/API Key.
  3. **Endpoints de Sincronização:**
     * `POST /api/v1/sync/batch`: Receber lote de vendas da fila local e salvar atomicamente no MySQL.
     * `GET /api/v1/catalog/changes`: Enviar atualizações de produtos cadastradas na nuvem para o desktop.
  4. **Módulo de Migração (Importador Nextar):**
     * Parser para arquivos CSV exportados do Nextar.
     * Script de importação para popular a base MySQL do cliente e alimentar o SQLite inicial.

---

## 5. Processo de Build e Empacotamento (.exe Windows)

### 5.1 Configuração do `electron-builder.json`
O Prisma exige que as Query Engines nativas do SQLite sejam tratadas corretamente durante o empacotamento em ASAR.

```json
{
  "appId": "com.seuempresa.pdv",
  "productName": "PDVPro",
  "directories": {
    "output": "dist"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "prisma/schema.prisma"
  ],
  "extraResources": [
    {
      "from": "node_modules/.prisma/client",
      "to": "prisma-client"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "resources/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "shortcutName": "PDV Pro"
  }
}
```

### 5.2 Scripts de Build no `package.json` do Desktop
```json
{
  "scripts": {
    "dev": "concurrently "vite" "electron ."",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "build": "tsc && vite build",
    "dist": "pnpm build && electron-builder --win"
  }
}
```

### 5.3 Executando o Build
Para gerar o executável final `.exe` para distribuição aos clientes:
```bash
pnpm prisma:generate
pnpm dist
```
O arquivo de instalação `.exe` será gerado na pasta `apps/desktop/dist/`.
