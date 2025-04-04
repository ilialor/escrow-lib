## Architecture

This library utilizes a modular architecture with the Facade pattern.

**Core Components:**

*   **`src/escrow-manager.ts` (Facade):** The main entry point. Coordinates actions. Configures and initializes the `AIService` with the chosen provider type and API key.
*   **`src/services/` (Service Layer):** Contains core business logic:
    *   `UserService`: Manages users.
    *   `OrderService`: Manages orders, including group order logic and representative voting.
    *   `DocumentService`: Manages document lifecycle.
    *   `AIService`: Acts as a context for the AI Strategy pattern. It holds an instance of a configured `IAiProvider` and delegates AI-related calls (like `generateDoR`) to it. It is configured by the `EscrowManager`.
*   **`src/services/ai/` (AI Providers):** Concrete implementations of the `IAiProvider` interface.
    *   `google-gemini.provider.ts`: Interacts with the actual Google Gemini API. Requires `@google/generative-ai` package and a valid API key. Handles prompt formatting for Gemini.
    *   `mock-ai.provider.ts`: Provides simulated AI responses for testing or use without an API key. Contains the previous simulation logic, slightly adapted for group orders.
    *   *(Other providers like `openai.provider.ts` could be added here in the future).*
*   **`src/interfaces/` (Interfaces):** Defines data structures.
    *   `base.ts`: Core interfaces (`IUser`, `IOrder`, `IDocument`). `IOrder` supports group orders.
    *   `ai-provider.interface.ts`: Defines the `IAiProvider` interface that all AI providers must implement.
*   **`src/utils/` (Utilities):** Shared constants and helpers.
*   **`src/index.ts` (Entry Point):** Exports the public API.

**Data Flow:**

Client Code -> `EscrowManager` -> Specific Service (e.g., `DocumentService`, `AIService`)
`AIService` -> Configured `IAiProvider` (e.g., `GoogleGeminiProvider`) -> External AI API / Mock Logic
-> (Data Layer - currently in-memory)

`EscrowManager` emits events.

**Configuration:**

AI functionality is configured when creating the `EscrowManager` instance by providing an AI provider type string (e.g., `'gemini'`, `'mock'`) and the corresponding API key (if required by the provider).

```typescript
// Use Google Gemini
const managerWithGemini = new EscrowManager({ providerType: 'gemini', apiKey: 'YOUR_GEMINI_API_KEY' });

// Use Mock AI (no key needed)
const managerWithMock = new EscrowManager({ providerType: 'mock' });
```

**File Structure:**

*   `/src`: Source code.
    *   `/interfaces`: Interfaces (`base.ts`, `ai-provider.interface.ts`, etc.).
    *   `/services`: Business logic services (`user.service.ts`, `order.service.ts`, `document.service.ts`, `ai.service.ts`).
        *   `/ai`: Concrete AI provider implementations (`google-gemini.provider.ts`, `mock-ai.provider.ts`).
    *   `/utils`: Utilities (`constants.ts`).
    *   `escrow-manager.ts`: Facade.
    *   `index.ts`: Entry point.
*   `/dist`: Compiled JS output.
*   `/docs`: Documentation.
*   `/tests`: Tests.
*   `package.json`: Dependencies (will include `@google/generative-ai`).
*   `tsconfig.json`: TypeScript config.

escrow-lib/
├── .git/
├── .gitignore
├── dist/
├── docs/
│   ├── README.md
│   ├── architecture.md # <-- YOU ARE HERE
│   ├── document-management.md
│   ├── events.md
│   └── group-orders.md
├── node_modules/
├── src/
│   ├── interfaces/
│   │   ├── ai-provider.interface.ts # New
│   │   ├── base.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── ai/                  # New Directory
│   │   │   ├── google-gemini.provider.ts # New
│   │   │   └── mock-ai.provider.ts      # New (moved from ai.service)
│   │   ├── ai.service.ts          # Refactored
│   │   ├── document-service.ts
│   │   ├── order-service.ts
│   │   └── user-service.ts
│   ├── utils/
│   │   └── constants.ts
│   ├── escrow-manager.ts      # Updated (constructor)
│   └── index.ts
├── tests/
│   └── ...
├── jest.config.js
├── package-lock.json
├── package.json             # Updated (dependencies)
├── README.md                # Updated (AI config)
├── tsconfig.json
└── tsconfig.test.json
