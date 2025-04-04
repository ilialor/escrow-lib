# Escrow Library (escrow-lib)

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Overview

Escrow Library (`escrow-lib`) is a modular TypeScript library designed for managing escrow deposits, document workflows, and communication in project-based orders, with specific support for group orders (multiple customers). It provides features for secure fund handling, milestone-based payouts, automated document generation/validation using AI (simulation included), and an event-driven architecture.

This library utilizes a Facade pattern (`EscrowManager`) providing a simple entry point to interact with underlying services for users, orders, documents, and AI.

## Features

*   **User Management:** Create and manage different user types (Customer, Contractor, Platform).
*   **Order & Milestone Management:** Create orders, define milestones with deadlines and budgets, track progress, and manage statuses.
*   **Document Workflow:** Manage project documents like Specifications, Deliverables, and Acts of Work.
*   **AI Integration (Simulated):**
    *   Automatically generate Definition of Ready (DoR), Roadmap, and Definition of Done (DoD) documents.
    *   Validate submitted Deliverables against DoD criteria.
    *   *(Note: Requires an API key, but the current implementation simulates AI responses).*
*   **Act of Work Management:** Generate, sign (multi-party), reject, and automatically sign Acts of Work to approve milestone completion and trigger payments.
*   **Event-Driven:** Subscribe to events for key state changes (order creation, funding, document generation, act completion, etc.).
*   **In-Memory Storage:** Uses in-memory storage for demonstration purposes (easily replaceable with a database layer).
*   **(Planned/Basic Support):** Group Orders, Communication module (placeholders, need further implementation).

## Installation & Usage (Local / GitHub)

Currently, this library is not published on npm. To use it in your local project:

**1. As part of the same monorepo or project:**

   *   Clone this repository or include its `src` directory in your project.
   *   Ensure your `tsconfig.json` includes the library's source files.
   *   Import directly from the source:
     ```typescript
     import { EscrowManager, UserType, ... } from './path/to/escrow-lib/src';
     ```

**2. Using `npm link` (for development across separate projects):**

   *   Navigate to the `escrow-lib` directory in your terminal:
     ```bash
     cd path/to/escrow-lib
     npm install # Install dependencies
     npm run build # Compile the library
     npm link # Create a global link
     ```
   *   Navigate to your project directory where you want to use the library:
     ```bash
     cd path/to/your-project
     npm link escrow-lib # Link the library to your project's node_modules
     ```
   *   Import in your project:
     ```typescript
     import { EscrowManager, UserType, ... } from 'escrow-lib';
     ```

## Quick Start

```typescript
import {
    EscrowManager,
    UserType,
    EscrowEvents,
    IUser,
    IOrder,
    // ... import other necessary types/enums
} from './src'; // Adjust path based on your setup

async function main() {
    // Initialize with a (mock) AI API Key to enable AI features
    const escrowManager = new EscrowManager('your-mock-or-real-api-key');

    // --- Setup Event Listeners (See "Events" section below for examples) ---
    escrowManager.on(EscrowEvents.ORDER_CREATED, (order: IOrder) => {
        console.log(`[Event] Order Created: ${order.title} (ID: ${order.id})`);
    });
    escrowManager.on(EscrowEvents.ACT_COMPLETED, (data: { actId: string, milestoneId: string }) => {
        console.log(`[Event] Act ${data.actId} Completed - Payment for Milestone ${data.milestoneId} initiated.`);
    });
    // ... add more listeners as needed

    try {
        // 1. Create Users
        const customer = await escrowManager.createUser('Alice Customer', UserType.CUSTOMER);
        const contractor = await escrowManager.createUser('Bob Contractor', UserType.CONTRACTOR);
        console.log(`Users created: ${customer.id}, ${contractor.id}`);

        // 2. Create Order
        const order = await escrowManager.createOrder(
            customer.id,
            'Project Alpha',
            'Develop the core module.',
            [
                { description: 'Milestone 1: Planning', amount: '500', deadline: new Date('2024-10-01') },
                { description: 'Milestone 2: Implementation', amount: '1500', deadline: new Date('2024-11-01') }
            ]
        );
        console.log(`Order created: ${order.id}`);

        // 3. Fund Order (requires customer balance simulation/integration)
        // await escrowManager.depositToUser(customer.id, order.totalAmount); // Simulate deposit
        // await escrowManager.fundOrder(order.id, customer.id, order.totalAmount);
        // console.log(`Order ${order.id} funded.`);

        // 4. Assign Contractor
        await escrowManager.assignContractor(order.id, contractor.id, customer.id); // Customer assigns
        console.log(`Contractor ${contractor.id} assigned to order ${order.id}`);

        // 5. Generate AI Documents (Optional)
        const roadmap = await escrowManager.generateRoadmap(order.id, customer.id);
        const dod = await escrowManager.generateDoD(order.id, customer.id);
        console.log(`Roadmap ${roadmap.id} and DoD ${dod.id} generated.`);

        // 6. Simulate Work & Submit Deliverable (e.g., for Milestone 1)
        const phaseId = roadmap.content.phases[0].id; // Assuming phase links to milestone
        const deliverable = await escrowManager.submitDeliverable(
            contractor.id,
            order.id,
            phaseId,
            'Planning Document v1',
            { details: 'Initial planning document submitted.' }
        );
        console.log(`Deliverable ${deliverable.id} submitted for phase ${phaseId}`);

        // 7. Validate Deliverable (Optional AI step)
        const validation = await escrowManager.validateDeliverables(order.id, phaseId);
        console.log(`Deliverable validation compliant: ${validation.compliant}`);

        // 8. Generate & Sign Act (e.g., for Milestone 1)
        if (validation.compliant) {
            const milestoneId = order.milestones[0].id;
            const act = await escrowManager.generateAct(order.id, milestoneId, [deliverable.id], contractor.id);
            console.log(`Act ${act.id} generated for milestone ${milestoneId}`);

            await escrowManager.signActDocument(act.id, contractor.id); // Contractor signs
            await escrowManager.signActDocument(act.id, customer.id); // Customer signs -> triggers ACT_COMPLETED event
        }

    } catch (error: any) {
        console.error("An error occurred:", error.message);
    } finally {
        escrowManager.cleanup(); // Important if using auto-signing timeouts
    }
}

main();
```

### Development Setup

To set up the library for local development or contribution:

#### Clone the repository:
```
git clone https://github.com/your-username/escrow-lib.git
cd escrow-lib
```
#### Install dependencies:

```
npm install
```

#### Build the library: (Compiles TypeScript to JavaScript in /dist)

```
npm run build
```

#### Running Tests
(Note: Tests need to be implemented for comprehensive coverage).
To run the test suite (using Jest, assuming jest.config.js is configured):
```
npm test
```

#### Running the Demo
A demo script (main.ts) is included to showcase the library's functionality. To run it:
Make sure you have installed dependencies (npm install).

Execute using ts-node:
```
npx ts-node main.ts
```
(This command compiles and runs the main.ts script directly, using the library's TypeScript source from ./src)

## Events
The EscrowManager extends EventEmitter and emits events for various state changes. Subscribe using the .on() method.
Key Events (See src/utils/constants.ts for full list and payloads):
```
EscrowEvents.USER_CREATED
EscrowEvents.ORDER_CREATED
EscrowEvents.ORDER_FUNDED
EscrowEvents.ORDER_CONTRACTOR_ASSIGNED
EscrowEvents.ORDER_STATUS_CHANGED
EscrowEvents.ORDER_COMPLETED
EscrowEvents.MILESTONE_STATUS_CHANGED
EscrowEvents.MILESTONE_PAID
EscrowEvents.DOCUMENT_CREATED
EscrowEvents.DOR_GENERATED / ROADMAP_GENERATED / DOD_GENERATED
EscrowEvents.DELIVERABLE_SUBMITTED
EscrowEvents.DELIVERABLE_VALIDATED
EscrowEvents.ACT_CREATED
EscrowEvents.ACT_SIGNED
EscrowEvents.ACT_REJECTED
EscrowEvents.ACT_COMPLETED
```

Example:
```
import { EscrowManager, EscrowEvents, IOrder } from './src'; // Or 'escrow-lib' if linked/installed

const manager = new EscrowManager();

manager.on(EscrowEvents.ORDER_CREATED, (order: IOrder) => {
  console.log(`New order "${order.title}" was created!`);
});

manager.on(EscrowEvents.MILESTONE_PAID, (data: { orderId: string; milestoneId: string; amount: number }) => {
  console.log(`Milestone ${data.milestoneId} paid ${data.amount}.`);
});
```


### Architecture
The library follows a modular architecture using the Facade pattern (EscrowManager) coordinating actions across various services (UserService, OrderService, DocumentService, AIService) located in src/services/. Interfaces defining data structures are in src/interfaces/. Shared utilities and constants are in src/utils/.
See docs/architecture.md for more details.

## Contributing
Contributions are welcome! Please follow standard fork/pull request workflows. Ensure code adheres to the existing style and that any new features include appropriate documentation and tests (when implemented).

## License
This project is licensed under the ISC License - see the LICENSE file for details (or specify directly, e.g., ISC).

## RU версия

Библиотека для управления эскроу-счетами и групповыми заказами с функциями коммуникации, документооборота и AI-интеграции.

## Возможности

- **Управление пользователями** - создание пользователей с различными ролями (заказчик, исполнитель, платформа)
- **Управление заказами** - создание, изменение и управление заказами
- **Групповые заказы** - поддержка заказов с несколькими участниками
- **Вехи** - разделение проектов на этапы с отдельными бюджетами
- **Эскроу-счета** - безопасное хранение средств до подтверждения выполнения работ
- **Акты** - формирование и подписание актов выполненных работ
- **Голосование** - система голосования для изменения представителя группы
- **Документы** - хранение и управление документами проекта
- **Коммуникация** - система обсуждений и сообщений внутри проектов
- **AI-интеграция** - автоматическая генерация документов и проверка соответствия критериям с использованием Google Gemini

## Установка

```bash
npm install escrow-lib
```

## Основные понятия

### Пользователи

В системе существуют три типа пользователей:
- **Заказчик (Customer)** - создает заказы и оплачивает их
- **Исполнитель (Contractor)** - выполняет работы по заказам
- **Платформа (Platform)** - выступает арбитром, взимает комиссию

### Заказы и вехи

Заказы содержат одну или несколько вех (milestones), каждая со своим бюджетом и описанием работ. Средства хранятся на эскроу-счете заказа и освобождаются по мере выполнения вех.

### Акты приемки

По завершении вехи исполнитель формирует акт выполненных работ, который должен быть подписан исполнителем и заказчиком (или представителем группы заказчиков).

### Документы

Система поддерживает различные типы документов, включая Definition of Ready (DoR), Definition of Done (DoD), дорожные карты и результаты работ, с возможностью автоматической генерации и проверки с использованием AI.

## Пример использования

```typescript
import { EscrowManager, UserType, OrderStatus } from 'escrow-lib';

// Инициализация с поддержкой AI
const escrowManager = new EscrowManager('ваш-gemini-api-ключ');

// Создание пользователей
const customer = await escrowManager.createUser('Иван', UserType.CUSTOMER);
const contractor = await escrowManager.createUser('Сергей', UserType.CONTRACTOR);

// Пополнение баланса заказчика
await escrowManager.deposit(customer.id, '1000');

// Создание заказа с вехами
const order = await escrowManager.createOrder(
  customer.id,
  'Разработка сайта',
  'Создание корпоративного сайта',
  [
    { description: 'Дизайн', amount: '300', deadline: new Date('2023-12-15') },
    { description: 'Верстка', amount: '300', deadline: new Date('2023-12-31') },
    { description: 'Программирование', amount: '400', deadline: new Date('2024-01-31') }
  ]
);

// Назначение исполнителя
await escrowManager.assignContractor(order.id, contractor.id);

// Финансирование заказа
await escrowManager.contributeFunds(order.id, customer.id, '1000');

// Автоматическая генерация документов с помощью AI
const dor = await escrowManager.generateDoR(order.id);
const roadmap = await escrowManager.generateRoadmap(order.id);
const dod = await escrowManager.generateDoD(order.id);

// Отправка результатов работы
const deliverable = await escrowManager.submitDeliverable(
  contractor.id,
  order.id,
  roadmap.content.phases[0].id,
  'Дизайн сайта',
  { description: 'Готовый дизайн всех страниц' },
  ['design1.png', 'design2.png']
);

// Проверка результатов на соответствие DoD
const validationResult = await escrowManager.validateDeliverables(
  order.id,
  roadmap.content.phases[0].id
);

// Если результаты соответствуют требованиям, создаем акт
if (validationResult.compliant) {
  // Создание акта выполненных работ
  const act = await escrowManager.generateAct(
    order.id,
    order.milestones[0].id,
    [deliverable.id]
  );
  
  // Подписание акта исполнителем
  await escrowManager.signActDocument(act.id, contractor.id);
  
  // Подписание акта заказчиком
  await escrowManager.signActDocument(act.id, customer.id);
}

// Подписка на события
escrowManager.on('milestone:completed', data => {
  console.log(`Веха ${data.milestoneId} помечена как выполненная`);
});

escrowManager.on('act:signed', data => {
  console.log(`Акт ${data.actId} подписан пользователем ${data.userId}`);
});
```

## Документация

Подробная документация доступна в директории [docs](docs):

- [README.md](docs/README.md) - Общая информация
- [users.md](docs/users.md) - Управление пользователями
- [orders.md](docs/orders.md) - Управление заказами и вехами
- [group-orders.md](docs/group-orders.md) - Групповые заказы
- [documents.md](docs/documents.md) - Работа с документами
- [document-management.md](docs/document-management.md) - Документооборот с AI
- [communication.md](docs/communication.md) - Система коммуникации
- [events.md](docs/events.md) - События и подписки

## Экспортируемые типы

Библиотека экспортирует следующие основные интерфейсы:
- Интерфейсы моделей (IUser, IOrder, IDocument, IMilestone, IAct) экспортируются из './interfaces/base'
- Перечисления (UserType, OrderStatus, DocumentType, ActStatus и т.д.) экспортируются из './utils/constants'

## Лицензия

MIT 
