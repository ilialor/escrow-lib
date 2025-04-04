import { EscrowManager } from '../src/escrow-manager';
import { AiServiceConfig } from '../src/services/ai.service';
import { EscrowEvents, UserType, OrderStatus, IOrder, IUser } from '../src'; // Assuming index exports necessary types
import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
// Mock services heavily to isolate EscrowManager logic
jest.mock('../src/services/user.service');
jest.mock('../src/services/order.service');
jest.mock('../src/services/document.service');
jest.mock('../src/services/ai.service');

// Import mocked versions AFTER jest.mock
import { UserService } from '../src/services/user.service';
import { OrderService } from '../src/services/order.service';
import { DocumentService } from '../src/services/document.service';
import { AIService } from '../src/services/ai.service';

// Get constructor types for mocking
const MockUserService = UserService as jest.MockedClass<typeof UserService>;
const MockOrderService = OrderService as jest.MockedClass<typeof OrderService>;
const MockDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>;
const MockAIService = AIService as jest.MockedClass<typeof AIService>;

describe('EscrowManager - Group Orders & AI Config', () => {
    let escrowManager: EscrowManager;
    // We don't need separate mock instances here if EscrowManager creates its own
    // Let's define the user objects directly for clarity in tests
    let userA: IUser;
    let userB: IUser;
    let userC: IUser;
    let contractorUser: IUser;

    let approveDocumentSpy: jest.SpiedFunction<typeof DocumentService.prototype.approveDocument>;
    let updateAiConfigSpy: jest.SpiedFunction<typeof AIService.prototype.updateConfig>;

    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Suppress console output during tests
    beforeAll(() => {
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    // Restore console output after all tests
    afterAll(() => {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    beforeEach(() => { // Make beforeEach synchronous again if no async setup needed
        // Reset mocks
        MockUserService.mockClear();
        MockOrderService.mockClear();
        MockDocumentService.mockClear();
        MockAIService.mockClear();

        // Define mock user data WITH IDs
        userA = { id: 'user-a-id', name: 'User A', type: UserType.CUSTOMER, balance: 1000 };
        userB = { id: 'user-b-id', name: 'User B', type: UserType.CUSTOMER, balance: 1000 };
        userC = { id: 'user-c-id', name: 'User C', type: UserType.CUSTOMER, balance: 1000 };
        contractorUser = { id: 'cont-id', name: 'Contractor', type: UserType.CONTRACTOR, balance: 0 };

        // IMPORTANT: Mock the implementation for the *instances* that EscrowManager will create
        // We need to mock the constructor or methods *before* EscrowManager is instantiated
        MockUserService.prototype.getUser = jest.fn<typeof UserService.prototype.getUser>().mockImplementation(async (userId: string) => {
            if (userId === userA.id) return userA;
            if (userId === userB.id) return userB;
            if (userId === userC.id) return userC;
            if (userId === contractorUser.id) return contractorUser;
            return null;
        });

        // Add basic mocks for other service methods used in tests if needed, e.g.:
        MockUserService.prototype.withdraw = jest.fn<typeof UserService.prototype.withdraw>().mockImplementation(async (userId, amount) => {
            if (userId === userA.id) return userA; // Simulate returning the user after withdrawal
            if (userId === userB.id) return userB;
            // If user not found in mock, throw an error like the real service might
            throw new Error(`Mock withdraw: User ${userId} not found`);
        });

        MockOrderService.prototype.createGroupOrder = jest.fn();
        MockOrderService.prototype.getOrder = jest.fn();
        MockOrderService.prototype.fundOrder = jest.fn();
        MockOrderService.prototype.voteForRepresentative = jest.fn();

         // Mock isEnabled for AI checks on the prototype so the instance gets it
         Object.defineProperty(MockAIService.prototype, 'isEnabled', { // Use defineProperty for getter mock
              value: jest.fn().mockReturnValue(true), // Mock AI is enabled by default
              configurable: true, // Allow reconfiguration
              writable: true // Allow mockReturnValue to be called later if needed
         });
         MockAIService.prototype.updateConfig = jest.fn();


        // Instantiate EscrowManager AFTER mocks are set up
        escrowManager = new EscrowManager({ providerType: 'mock' }); // Start with mock for simplicity
    });

    it('should create a group order and emit GROUP_ORDER_CREATED', async () => {
        const customerIds = [userA.id, userB.id];
        const mockGroupOrder = { id: 'grp-order-1', customerIds, isGroupOrder: true } as IOrder;
         // Access the *mocked instance* created by EscrowManager
         const managerOrderService = (escrowManager as any).orderService as jest.Mocked<OrderService>;
         // Set the mock return value for this specific test case
         managerOrderService.createGroupOrder.mockResolvedValue(mockGroupOrder);

        const emitSpy = jest.spyOn(escrowManager, 'emit');

        const createdOrder = await escrowManager.createGroupOrder(customerIds, 'Grp Test', 'Desc', [], userA.id);

        // Check that the *mocked instance's* method was called
        expect(managerOrderService.createGroupOrder).toHaveBeenCalledWith(customerIds, 'Grp Test', 'Desc', [], userA.id);
        expect(createdOrder).toEqual(mockGroupOrder);
        expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.GROUP_ORDER_CREATED, mockGroupOrder);

        emitSpy.mockRestore();
    });

     it('should handle contributions to a group order and emit events', async () => {
         const orderId = 'grp-order-fund';
         const mockOrder = { id: orderId, customerIds: [userA.id, userB.id], isGroupOrder: true, totalAmount: 1000, fundedAmount: 0, status: OrderStatus.CREATED } as IOrder;
         const updatedOrder = { ...mockOrder, fundedAmount: 500, status: OrderStatus.CREATED }; // After first contribution
         const finalOrder = { ...mockOrder, fundedAmount: 1000, status: OrderStatus.FUNDED }; // Fully funded

         // Access the mocked instances used by EscrowManager
         const managerOrderService = (escrowManager as any).orderService as jest.Mocked<OrderService>;
         const managerUserService = (escrowManager as any).userService as jest.Mocked<UserService>;

         // Set mock return values for this test
         managerOrderService.getOrder.mockResolvedValue(mockOrder); // Initial getOrder check
         managerUserService.withdraw.mockResolvedValue(userA); // Simulate successful withdrawal for userA
         // Mock fundOrder return values for sequence
         managerOrderService.fundOrder
             .mockResolvedValueOnce({ order: updatedOrder, newFundedAmount: 500 }) // First call
             .mockResolvedValueOnce({ order: finalOrder, newFundedAmount: 1000 }); // Second call

         const emitSpy = jest.spyOn(escrowManager, 'emit');

         // First contribution
         await escrowManager.contributeFunds(orderId, userA.id, 500);
         expect(managerUserService.withdraw).toHaveBeenCalledWith(userA.id, 500);
         expect(managerOrderService.fundOrder).toHaveBeenCalledWith(orderId, userA.id, 500);
         expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_FUNDS_CONTRIBUTED, { orderId, customerId: userA.id, amount: 500, newFundedAmount: 500 });

         // Second contribution (fully funds)
         managerOrderService.getOrder.mockResolvedValue(updatedOrder); // getOrder check before second contribution
         managerUserService.withdraw.mockResolvedValue(userB); // Simulate successful withdrawal for userB
         await escrowManager.contributeFunds(orderId, userB.id, 500);
         expect(managerUserService.withdraw).toHaveBeenCalledWith(userB.id, 500);
         expect(managerOrderService.fundOrder).toHaveBeenCalledWith(orderId, userB.id, 500);
         expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_FUNDS_CONTRIBUTED, { orderId, customerId: userB.id, amount: 500, newFundedAmount: 1000 });
         expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, oldStatus: OrderStatus.CREATED, newStatus: OrderStatus.FUNDED });
         expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_FUNDED, finalOrder);

         emitSpy.mockRestore();
     });

    it('should call OrderService.voteForRepresentative and emit event on change', async () => {
        const orderId = 'grp-order-vote';
        const mockOrder = { id: orderId, customerIds: [userA.id, userB.id], isGroupOrder: true, representativeId: userA.id } as IOrder;
        const managerOrderService = (escrowManager as any).orderService as jest.Mocked<OrderService>;
        // Simulate a successful vote change
        managerOrderService.voteForRepresentative.mockResolvedValue({
            order: { ...mockOrder, representativeId: userB.id }, // Order state *after* change
            voteResult: { changed: true, newRepresentativeId: userB.id }
        });

        const emitSpy = jest.spyOn(escrowManager, 'emit');

        await escrowManager.voteForRepresentative(orderId, userA.id, userB.id);

        expect(managerOrderService.voteForRepresentative).toHaveBeenCalledWith(orderId, userA.id, userB.id);
        expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.GROUP_ORDER_REPRESENTATIVE_CHANGED, {
            orderId,
            oldRepresentativeId: userB.id, // Should be the new rep ID from the resolved vote result
            newRepresentativeId: userB.id
        });

        emitSpy.mockRestore();
    });

     it('should reconfigure AIService when updateAiConfig is called', () => {
         const managerAiService = (escrowManager as any).aiService as jest.Mocked<AIService>;
         const newConfig: AiServiceConfig = { providerType: 'gemini', apiKey: 'new-key' };

         escrowManager.updateAiConfig(newConfig);

         // Check the mock on the instance managed by EscrowManager
         expect(managerAiService.updateConfig).toHaveBeenCalledTimes(1);
         expect(managerAiService.updateConfig).toHaveBeenCalledWith(newConfig);
     });

    // Add tests for signActDocument, rejectAct, approveDocument focusing on EscrowManager's interaction
    // e.g., verifying it calls documentService.signAct and emits ACT_SIGNED
});
