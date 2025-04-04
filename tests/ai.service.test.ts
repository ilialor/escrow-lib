import { AIService, AiServiceConfig } from '../src/services/ai.service';
import { MockAiProvider } from '../src/services/ai/mock-ai.provider';
import { GoogleGeminiProvider } from '../src/services/ai/google-gemini.provider';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
// Import necessary types
import { IOrder, IDoRDocument, IValidationResult, IDeliverableDocument, IDoDDocument, DocumentType } from '../src/interfaces';

// Mock the actual providers
jest.mock('../src/services/ai/mock-ai.provider');
jest.mock('../src/services/ai/google-gemini.provider');

const MockAiProviderMock = MockAiProvider as jest.MockedClass<typeof MockAiProvider>;
const GoogleGeminiProviderMock = GoogleGeminiProvider as jest.MockedClass<typeof GoogleGeminiProvider>;

// Helper to get the *actual* provider instance used by AIService
const getInternalProvider = (aiService: AIService): any => {
    return (aiService as any).provider;
}

describe('AIService', () => {

    beforeEach(() => {
        // Reset mocks and mock instances before each test
        MockAiProviderMock.mockClear();
        MockAiProviderMock.mock.instances.length = 0; // Clear instances
        GoogleGeminiProviderMock.mockClear();
        GoogleGeminiProviderMock.mock.instances.length = 0; // Clear instances
    });

    it('should initialize with MockAiProvider by default', () => {
        const aiService = new AIService({ providerType: 'mock' });
        // Default init (1) + initializeProvider calls mock again (1) = 2
        expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
        expect(GoogleGeminiProviderMock).not.toHaveBeenCalled();
        expect(aiService.isEnabled()).toBe(true);
        expect(getInternalProvider(aiService)).toBeInstanceOf(MockAiProvider);
    });

    it('should initialize with MockAiProvider if config.providerType is undefined', () => {
        // Test scenario where config might be partially defined or providerType missing
        const aiService = new AIService({} as AiServiceConfig);
        // Default init (1) + initializeProvider calls default mock again (1) = 2
        expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
        expect(GoogleGeminiProviderMock).not.toHaveBeenCalled();
        expect(aiService.isEnabled()).toBe(true);
        expect(getInternalProvider(aiService)).toBeInstanceOf(MockAiProvider);
    });


    it('should initialize with GoogleGeminiProvider when specified with API key', () => {
        const config: AiServiceConfig = { providerType: 'gemini', apiKey: 'test-key' };
        const aiService = new AIService(config);
        expect(GoogleGeminiProviderMock).toHaveBeenCalledTimes(1);
        expect(GoogleGeminiProviderMock).toHaveBeenCalledWith('test-key');
        // Default init (1) only. initializeProvider calls Gemini.
        expect(MockAiProviderMock).toHaveBeenCalledTimes(1);
        expect(aiService.isEnabled()).toBe(true);
        expect(getInternalProvider(aiService)).toBeInstanceOf(GoogleGeminiProvider);
    });

    it('should fallback to MockAiProvider if Gemini provider specified but API key is missing', () => {
        const config: AiServiceConfig = { providerType: 'gemini' }; // No API key
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const aiService = new AIService(config);

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('API Key is required for Gemini provider'));
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Falling back to Mock AI provider'));
        // Default init (1) + initializeProvider falls back to Mock (1) = 2
        expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
        expect(GoogleGeminiProviderMock).not.toHaveBeenCalled();
        expect(aiService.isEnabled()).toBe(true);
        expect(getInternalProvider(aiService)).toBeInstanceOf(MockAiProvider);

        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

     it('should fallback to MockAiProvider if Gemini provider initialization fails', () => {
         // Make the mock constructor throw an error
         GoogleGeminiProviderMock.mockImplementationOnce(() => {
             throw new Error('Initialization failed');
         });
         const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
         const config: AiServiceConfig = { providerType: 'gemini', apiKey: 'test-key' };

         const aiService = new AIService(config);

         expect(GoogleGeminiProviderMock).toHaveBeenCalledTimes(1); // Attempted to initialize
         expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize GoogleGeminiProvider: Initialization failed'));
         // Default init (1) + initializeProvider fails Gemini then calls Mock fallback (1) = 2
         expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
         expect(aiService.isEnabled()).toBe(true);
         expect(getInternalProvider(aiService)).toBeInstanceOf(MockAiProvider);

         consoleErrorSpy.mockRestore();
     });


    it('should delegate generateDoR call to the configured provider', async () => {
        const mockDoRData: Omit<IDoRDocument, 'id' | 'createdAt'> = {
            orderId: 'order-123',
            type: DocumentType.DEFINITION_OF_READY,
            name: 'Mock DoR',
            createdBy: 'user-mock',
            content: { format: '', volume: '', resources: [], recommendations: [], timeline: '', risks: [] } // Minimal content
        } as any;
        const mockGenerateDoR = jest.fn<typeof MockAiProvider.prototype.generateDoR>().mockResolvedValue(mockDoRData);

        const aiService = new AIService({ providerType: 'mock' });

        // Get the *actual* provider instance used by aiService and assign mock to it
        const internalProvider = getInternalProvider(aiService) as jest.Mocked<MockAiProvider>; // Cast to mocked type
        internalProvider.generateDoR = mockGenerateDoR;

        const order = { id: 'order-123', milestones: [] } as unknown as IOrder;
        const userId = 'user1';

        await aiService.generateDoR(order, userId);

        expect(mockGenerateDoR).toHaveBeenCalledTimes(1);
        expect(mockGenerateDoR).toHaveBeenCalledWith(order, userId);
    });

     it('should delegate validateDeliverables call to the configured provider', async () => {
          const mockValidationResult: IValidationResult = {
              orderId: 'order-456',
              phaseId: 'p1',
              deliverableIds: ['d1'],
              compliant: true,
              overallScore: 100,
              details: [],
              checkedAt: new Date()
          } as any;
          const mockValidate = jest.fn<typeof GoogleGeminiProvider.prototype.validateDeliverables>().mockResolvedValue(mockValidationResult);

          const aiService = new AIService({ providerType: 'gemini', apiKey: 'key' });

          // Get the *actual* provider instance used by aiService and assign mock to it
          const internalProvider = getInternalProvider(aiService) as jest.Mocked<GoogleGeminiProvider>; // Cast to mocked type
          internalProvider.validateDeliverables = mockValidate;

          const order = { id: 'order-456' } as unknown as IOrder;
          const phaseId = 'p1';
          const deliverables = [{ id: 'd1', name: 'Del 1' }] as unknown as IDeliverableDocument[];
          const dod = { content: { criteria: [] } } as unknown as IDoDDocument;

          await aiService.validateDeliverables(order, phaseId, deliverables, dod);

          expect(mockValidate).toHaveBeenCalledTimes(1);
          expect(mockValidate).toHaveBeenCalledWith(order, phaseId, deliverables, dod);
     });

     it('should update provider when config is updated', () => {
         const config1: AiServiceConfig = { providerType: 'mock' };
         const aiService = new AIService(config1);
         // Default init (1) + initializeProvider calls Mock (1) = 2
         expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
         expect(GoogleGeminiProviderMock).not.toHaveBeenCalled();
         expect(getInternalProvider(aiService)).toBeInstanceOf(MockAiProvider);

         const config2: AiServiceConfig = { providerType: 'gemini', apiKey: 'new-key' };
         aiService.updateConfig(config2);

         // updateConfig calls initializeProvider again.
         // Total Mock calls: Initial default (1) + Initial mock init (1) + Gemini init attempt (0) = 2
         // Total Gemini calls: Gemini init attempt (1)
         expect(MockAiProviderMock).toHaveBeenCalledTimes(2);
         expect(GoogleGeminiProviderMock).toHaveBeenCalledTimes(1); // The call from updateConfig's initializeProvider
         expect(GoogleGeminiProviderMock).toHaveBeenCalledWith('new-key');
         expect(aiService.isEnabled()).toBe(true);
         expect(getInternalProvider(aiService)).toBeInstanceOf(GoogleGeminiProvider);
     });
});
