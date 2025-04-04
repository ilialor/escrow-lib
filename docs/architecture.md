## Architecture

This library utilizes a modular architecture with the Facade pattern.

**Core Components:**

*   **`src/escrow-manager.ts` (Facade):** The main entry point for interacting with the library. It coordinates actions across different services.
*   **`src/services/` (Service Layer):** Contains the core business logic, separated by domain:
    *   `UserService`: Manages user creation, retrieval, and balance operations.
    *   `OrderService`: Handles order creation, assignment, funding, representative voting etc.
    *   `DocumentService`: Manages document lifecycle (creation, approval, submission).
    *   `AIService` (Optional): Integrates with AI for document generation/validation.
*   **`src/interfaces/` (Interfaces):** Defines the data structures (contracts) used throughout the library. Key interfaces (`IUser`, `IOrder`, `IDocument`) are defined in `base.ts`. `IOrder` now includes `customerIds`, `isGroupOrder`, `representativeId`, and `votes` fields to support group orders.
*   **`src/utils/` (Utilities):** Shared constants and helper functions.
*   **`src/index.ts` (Entry Point):** Exports the public API of the library.

**Data Flow:**

Client Code -> `EscrowManager` -> Specific Service(s) -> (Data Layer - currently in-memory)

`EscrowManager` emits events for key state changes.

**File Structure:**

*   `/src`: Contains all TypeScript source code.
    *   `/interfaces`: TypeScript interfaces.
    *   `/services`: Business logic services.
    *   `/utils`: Shared constants and utilities.
    *   `escrow-manager.ts`: Facade class.
    *   `index.ts`: Main export file.
*   `/dist`: Compiled JavaScript output.
*   `/docs`: Developer documentation.
*   `/tests`: Unit and integration tests.
*   `package.json`: Project metadata and dependencies.
*   `tsconfig.json`: TypeScript compiler configuration.

escrow-lib/
├── .git/                 # Git репозиторий
├── .gitignore            # Файлы, игнорируемые Git
├── dist/                 # Скомпилированный JavaScript код (результат сборки TypeScript)
├── docs/                 # Директория с документацией проекта
│   ├── README.md         # Документация для разработчиков
│   └── document-management.md # Специфичная документация по управлению документами
├── node_modules/         # Зависимости проекта
├── src/                  # Исходный код библиотеки на TypeScript
│   ├── interfaces/       # Определения интерфейсов TypeScript
│   │   ├── base.ts       # Основные интерфейсы (IUser, IOrder, IDocument и т.д.)
│   │   ├── services.ts   # Интерфейсы для сервисов (возможно, избыточны)
│   │   └── index.ts      # Точка экспорта для всех интерфейсов, включая алиасы
│   ├── services/         # Сервисы, инкапсулирующие бизнес-логику
│   │   ├── ai-service.ts   # Логика взаимодействия с AI (Gemini)
│   │   ├── document-service.ts # Логика управления документами
│   │   ├── order-service.ts    # Логика управления заказами
│   │   └── user-service.ts     # Логика управления пользователями
│   ├── utils/            # Вспомогательные утилиты и константы
│   │   └── constants.ts  # Определения Enum (UserType, OrderStatus и т.д.)
│   ├── escrow-manager.ts # Основной класс-фасад библиотеки
│   └── index.ts          # Главная точка входа в библиотеку (экспорты)
├── tests/                # Директория для тестов
│   └── ... (файлы тестов)
├── jest.config.js        # Конфигурация для тестового фреймворка Jest
├── package-lock.json     # Зафиксированные версии зависимостей
├── package.json          # Метаданные проекта и зависимости
├── README.md             # Основное описание проекта для пользователей
├── tsconfig.json         # Конфигурация компилятора TypeScript
└── tsconfig.test.json    # Конфигурация TypeScript для тестов
