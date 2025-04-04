import {
    IOrder, IDocument, IDoRDocument, DocumentType, IRoadmapDocument, IRoadmapPhase,
    IDoDDocument, IDoDCriterion, IValidationResult, IDeliverableDocument, IValidationCriterionDetail,
    ISpecificationDocument
} from '../interfaces';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { GoogleGeminiProvider } from './ai/google-gemini.provider';
import { MockAiProvider } from './ai/mock-ai.provider';

// Define supported provider types
export type AiProviderType = 'gemini' | 'mock';

export interface AiServiceConfig {
    providerType: AiProviderType;
    apiKey?: string; // Required only for certain providers like 'gemini'
}

/**
 * AIService acts as a context or facade for the selected AI provider.
 * It holds an instance of the configured provider and delegates calls to it.
 */
export class AIService {
    // Initialize provider with a default (Mock) to satisfy TypeScript
    private provider: IAiProvider = new MockAiProvider(); // Default initialization
    private config: AiServiceConfig;
    private enabled: boolean = false;
    private readonly LOG_PREFIX = '[AIService]';

    constructor(config: AiServiceConfig) {
        this.config = config;
        this.initializeProvider();
    }

    private initializeProvider(): void {
        console.log(`${this.LOG_PREFIX} Initializing provider of type: ${this.config.providerType}`);
        switch (this.config.providerType) {
            case 'gemini':
                if (!this.config.apiKey) {
                    console.error(`${this.LOG_PREFIX} API Key is required for Gemini provider, but was not provided. AI disabled.`);
                    // Fallback to mock provider or throw error?
                    // Let's fallback to mock provider to avoid hard crash if API key missing.
                    console.warn(`${this.LOG_PREFIX} Falling back to Mock AI provider due to missing API key for Gemini.`);
                    this.provider = new MockAiProvider();
                    this.enabled = true; // Mock is always enabled
                } else {
                    try {
                         this.provider = new GoogleGeminiProvider(this.config.apiKey);
                         this.enabled = true;
                    } catch (error: any) {
                         console.error(`${this.LOG_PREFIX} Failed to initialize GoogleGeminiProvider: ${error.message}. Falling back to Mock AI.`);
                         this.provider = new MockAiProvider();
                         this.enabled = true; // Mock is enabled even if Gemini fails
                    }
                }
                break;
            case 'mock':
                this.provider = new MockAiProvider();
                this.enabled = true;
                break;
            default:
                console.error(`${this.LOG_PREFIX} Unsupported AI provider type: ${this.config.providerType}. Defaulting to Mock AI.`);
                this.provider = new MockAiProvider();
                this.enabled = true;
        }
        console.log(`${this.LOG_PREFIX} Provider initialized. AI Enabled: ${this.enabled}`);
    }

    // Update configuration (e.g., change API key or provider type)
    updateConfig(newConfig: Partial<AiServiceConfig>): void {
         // Merge new config with existing
         this.config = { ...this.config, ...newConfig };
         console.log(`${this.LOG_PREFIX} Configuration updated. Re-initializing provider...`);
         this.initializeProvider(); // Re-initialize with the new config
    }

    isEnabled(): boolean {
        // Return true if we have a provider instance (even mock)
        return this.enabled;
    }

    // --- Delegate methods to the configured provider ---

    async generateDoR(order: IOrder, creatorUserId: string): Promise<Omit<IDoRDocument, 'id' | 'createdAt'>> {
        if (!this.isEnabled()) throw new Error("AI Service is not enabled.");
        return this.provider.generateDoR(order, creatorUserId);
    }

    async generateRoadmap(order: IOrder, creatorUserId: string): Promise<Omit<IRoadmapDocument, 'id' | 'createdAt'>> {
         if (!this.isEnabled()) throw new Error("AI Service is not enabled.");
         return this.provider.generateRoadmap(order, creatorUserId);
     }

     async generateDoD(order: IOrder, roadmap: IRoadmapDocument, creatorUserId: string): Promise<Omit<IDoDDocument, 'id' | 'createdAt'>> {
          if (!this.isEnabled()) throw new Error("AI Service is not enabled.");
          return this.provider.generateDoD(order, roadmap, creatorUserId);
     }

     async validateDeliverables(
        order: IOrder,
        phaseId: string,
        deliverables: IDeliverableDocument[],
        dod: IDoDDocument
     ): Promise<IValidationResult> {
        if (!this.isEnabled()) throw new Error("AI Service is not enabled.");
        return this.provider.validateDeliverables(order, phaseId, deliverables, dod);
     }

    // --- Deprecated methods (to be removed or updated if needed) ---
    /*
    setApiKey(apiKey: string): void {
        console.warn(`${this.LOG_PREFIX} setApiKey is deprecated. Use updateConfig({ apiKey: '...' }) instead.`);
        this.updateConfig({ apiKey });
    }
    */
}