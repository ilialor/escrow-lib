import { Decimal } from 'decimal.js';
// Import Jest functions
import { describe, test, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
// Import EscrowManager and Enums directly
import { EscrowManager } from '../src/escrow-manager';
import { UserType, OrderStatus, DocumentType, EscrowEvents } from '../src'; // Import from index
// Import Base Interfaces for type checking if needed
import { IUser, IOrder, IDocument } from '../src/interfaces'; // Import from interfaces
// Import specific types needed
import { IMilestoneInputData } from '../src/services/order.service';
// Import service classes for spying
import { UserService } from '../src/services/user.service';
import { OrderService } from '../src/services/order.service';
import { DocumentService } from '../src/services/document.service';

describe('EscrowManager (Standard Flow)', () => {
  let escrowManager: EscrowManager;
  // Define mock data at describe scope
  const mockCustomerData: IUser = { id: 'cust-1', name: 'Test Customer', type: UserType.CUSTOMER, balance: 1000 };
  const mockContractorData: IUser = { id: 'cont-1', name: 'Test Contractor', type: UserType.CONTRACTOR, balance: 0 };

  // --- Declare spies --- DONE
  let getUserSpy: jest.SpiedFunction<typeof UserService.prototype.getUser>;
  let withdrawSpy: jest.SpiedFunction<typeof UserService.prototype.withdraw>;
  let createOrderSpy: jest.SpiedFunction<typeof OrderService.prototype.createOrder>;
  let getOrderSpy: jest.SpiedFunction<typeof OrderService.prototype.getOrder>;
  let fundOrderSpy: jest.SpiedFunction<typeof OrderService.prototype.fundOrder>;
  let approveDocumentSpy: jest.SpiedFunction<typeof DocumentService.prototype.approveDocument>;
  let getDocumentSpy: jest.SpiedFunction<typeof DocumentService.prototype.getDocument>; // Add spy for getDocument

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

  beforeEach(async () => { // Make beforeEach async
    // Reset mocks before each test
    jest.restoreAllMocks(); // Restore original implementations

    // Instantiate EscrowManager FIRST - it creates its own service instances
    escrowManager = new EscrowManager();

    // --- Use jest.spyOn on the *internal instances* --- DONE
    getUserSpy = jest.spyOn(escrowManager['userService'], 'getUser');
    withdrawSpy = jest.spyOn(escrowManager['userService'], 'withdraw');
    createOrderSpy = jest.spyOn(escrowManager['orderService'], 'createOrder');
    getOrderSpy = jest.spyOn(escrowManager['orderService'], 'getOrder');
    fundOrderSpy = jest.spyOn(escrowManager['orderService'], 'fundOrder');
    approveDocumentSpy = jest.spyOn(escrowManager['documentService'], 'approveDocument');
    getDocumentSpy = jest.spyOn(escrowManager['documentService'], 'getDocument'); // Spy on getDocument

    // --- Simulate user creation by mocking getUser to return null initially, then the user --- DONE
    // This setup assumes EscrowManager's createUser calls userService.createUser internally,
    // which then makes the user findable via userService.getUser.
    // Let's simplify: Assume users exist and mock getUser directly.
    getUserSpy.mockImplementation(async (id) => {
      if (id === mockCustomerData.id) return { ...mockCustomerData };
      if (id === mockContractorData.id) return { ...mockContractorData };
      return null;
    });

    // Configure spy implementations for withdraw
    withdrawSpy.mockImplementation(async (id, amount) => {
      if (id === mockCustomerData.id && mockCustomerData.balance >= amount) {
        // Return a copy simulating the state *before* withdrawal if needed by caller
        return { ...mockCustomerData };
      }
      throw new Error('Insufficient funds or user not found');
    });

    // No need to mock createUser or deposit spies if we assume users exist via getUser mock

  });

  test('should allow creating orders after users are created', async () => {
      // Test getUser is called by EscrowManager when needed
      // (e.g., inside createOrder to validate customerId)
      getUserSpy.mockResolvedValueOnce({ ...mockCustomerData }); // Mock getUser for createOrder validation

      const milestonesInput: IMilestoneInputData[] = [
        { description: 'Milestone 1', amount: 500, deadline: new Date() },
        { description: 'Milestone 2', amount: 300, deadline: new Date() }
      ];
      const expectedOrder: IOrder = {
          id: 'order-1', customerIds: [mockCustomerData.id], isGroupOrder: false, contractorId: undefined,
          title: 'Test Order', description: 'Desc',
          milestones: [
              { id:'m1', orderId: 'order-1', description: 'Milestone 1', amount: 500, deadline: milestonesInput[0].deadline as Date, status: 'PENDING' as any, paid: false },
              { id:'m2', orderId: 'order-1', description: 'Milestone 2', amount: 300, deadline: milestonesInput[1].deadline as Date, status: 'PENDING' as any, paid: false }
          ],
          status: OrderStatus.CREATED, totalAmount: 800, fundedAmount: 0,
          createdAt: new Date(),
      };

      // Mock the underlying service method using the spy
      createOrderSpy.mockResolvedValue(expectedOrder);

      const createdOrder = await escrowManager.createOrder(
        mockCustomerData.id,
        'Test Order',
        'Desc',
        milestonesInput
      );

      // Verify delegation using the spy
      expect(getUserSpy).toHaveBeenCalledWith(mockCustomerData.id); // Check getUser was called by createOrder
      expect(createOrderSpy).toHaveBeenCalledWith(mockCustomerData.id, 'Test Order', 'Desc', milestonesInput);
      // Check result
      expect(createdOrder).toEqual(expectedOrder);
      expect(createdOrder.totalAmount).toBe(800);
  });

  test('should fund order and change status (delegating)', async () => {
    const orderId = 'order-to-fund';
    const initialOrder: IOrder = { id: orderId, customerIds: [mockCustomerData.id], status: OrderStatus.CREATED, totalAmount: 500, fundedAmount: 0 } as IOrder;
    const fundedOrder: IOrder = { ...initialOrder, status: OrderStatus.FUNDED, fundedAmount: 500 };

    // Mock service calls involved in funding using spies
    getUserSpy.mockResolvedValue({ ...mockCustomerData }); // For contributeFunds user check
    getOrderSpy.mockResolvedValue(initialOrder); // For contributeFunds order check
    withdrawSpy.mockResolvedValue({ ...mockCustomerData }); // Mock withdraw success
    fundOrderSpy.mockResolvedValue({ order: fundedOrder, newFundedAmount: 500 });

    const emitSpy = jest.spyOn(escrowManager, 'emit');

    const updatedOrderAfterFunding = await escrowManager.contributeFunds(orderId, mockCustomerData.id, 500);

    expect(getUserSpy).toHaveBeenCalledWith(mockCustomerData.id);
    expect(withdrawSpy).toHaveBeenCalledWith(mockCustomerData.id, 500);
    expect(getOrderSpy).toHaveBeenCalledWith(orderId);
    expect(fundOrderSpy).toHaveBeenCalledWith(orderId, mockCustomerData.id, 500);
    expect(updatedOrderAfterFunding.status).toBe(OrderStatus.FUNDED);

    // Check events
    expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_FUNDS_CONTRIBUTED, expect.objectContaining({ orderId, customerId: mockCustomerData.id, amount: 500, newFundedAmount: 500 }));
    expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_STATUS_CHANGED, expect.objectContaining({ orderId, oldStatus: OrderStatus.CREATED, newStatus: OrderStatus.FUNDED }));
    expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.ORDER_FUNDED, fundedOrder);

    emitSpy.mockRestore();
  });

  test('should approve a document (delegating to DocumentService)', async () => {
      const docId = 'doc-123';
      const orderId = 'order-for-doc';
      const documentToApprove: IDocument = {
          id: docId,
          orderId: orderId,
          type: DocumentType.DEFINITION_OF_READY,
          name: 'Test DoR',
          createdBy: mockCustomerData.id, // Use mockCustomerData.id
          createdAt: new Date(),
          content: { format: '', volume: '', resources: [], recommendations: [], timeline: '', risks: [] },
          approvedBy: []
      };
      const documentAfterApproval: IDocument = {
          ...documentToApprove,
          approvedBy: [mockContractorData.id], // Use mockContractorData.id
          content: { format: '', volume: '', resources: [], recommendations: [], timeline: '', risks: [] },
      };

      // Mock the underlying service methods using spies
      getUserSpy.mockResolvedValue({ ...mockContractorData }); // For approveDocument user check
      approveDocumentSpy.mockResolvedValue(documentAfterApproval);
      // Mock getDocument if needed (e.g., if EscrowManager fetches after approval)
      getDocumentSpy.mockResolvedValue(documentAfterApproval);

      const approvalResult = await escrowManager.approveDocument(docId, mockContractorData.id);

      expect(getUserSpy).toHaveBeenCalledWith(mockContractorData.id);
      expect(approveDocumentSpy).toHaveBeenCalledWith(docId, mockContractorData.id);
      expect(approvalResult).toBeDefined();
      expect(approvalResult?.approvedBy).toContain(mockContractorData.id);

      // Optional: Verify event emission
      // const emitSpy = jest.spyOn(escrowManager, 'emit');
      // expect(emitSpy).toHaveBeenCalledWith(EscrowEvents.DOCUMENT_APPROVED, ...);
      // emitSpy.mockRestore();
  });

  // test('should create and manage group order funding'...) - Moved to group test file
  // test('should create and approve a document'...) - Test above covers delegation
  // test('should handle complete escrow workflow'...) - Requires significant rewrite based on current features
}); 