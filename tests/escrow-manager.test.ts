import { Decimal } from 'decimal.js';
import { 
  EscrowManager, 
  EscrowEvents,
  UserType, 
  OrderStatus, 
  DocumentType,
  MessageType
} from '../src';

describe('EscrowManager', () => {
  let escrowManager: EscrowManager;
  let customerId: string;
  let contractorId: string;
  let orderId: string;
  
  beforeEach(async () => {
    escrowManager = new EscrowManager();
    
    // Create test users
    const customer = await escrowManager.createUser('Test Customer', UserType.CUSTOMER);
    const contractor = await escrowManager.createUser('Test Contractor', UserType.CONTRACTOR);
    
    customerId = customer.id;
    contractorId = contractor.id;
    
    // Add funds to customer
    await escrowManager.deposit(customerId, '1000');
  });
  
  test('should create users with correct types', async () => {
    const customer = await escrowManager.getUser(customerId);
    const contractor = await escrowManager.getUser(contractorId);
    
    expect(customer.userType).toBe(UserType.CUSTOMER);
    expect(contractor.userType).toBe(UserType.CONTRACTOR);
  });
  
  test('should create order with milestones', async () => {
    const milestones = [
      { description: 'Milestone 1', amount: '500' },
      { description: 'Milestone 2', amount: '300' }
    ];
    
    const order = await escrowManager.createOrder(
      customerId,
      'Test Order',
      'Test Order Description',
      milestones
    );
    
    orderId = order.id;
    
    expect(order.title).toBe('Test Order');
    expect(order.status).toBe(OrderStatus.CREATED);
    expect(order.milestones.length).toBe(2);
    expect(order.totalCost.toString()).toBe('800');
  });
  
  test('should fund order and change status', async () => {
    // Create order
    const order = await escrowManager.createOrder(
      customerId,
      'Test Order',
      'Test Order Description',
      [{ description: 'Milestone 1', amount: '500' }]
    );
    
    orderId = order.id;
    
    // Mock event listener
    const mockFundedListener = jest.fn();
    escrowManager.once(EscrowEvents.ORDER_FUNDED, mockFundedListener);
    
    // Fund order
    await escrowManager.contributeFunds(orderId, customerId, '500');
    
    // Check order status
    const updatedOrder = await escrowManager.getOrder(orderId);
    expect(updatedOrder.status).toBe(OrderStatus.FUNDED);
    
    // Check event was fired
    expect(mockFundedListener).toHaveBeenCalled();
  });
  
  test('should create and manage group order', async () => {
    // Create additional customer
    const secondCustomer = await escrowManager.createUser('Second Customer', UserType.CUSTOMER);
    await escrowManager.deposit(secondCustomer.id, '500');
    
    // Create group order
    const milestones = [
      { description: 'Group Task', amount: '1000' }
    ];
    
    const groupOrder = await escrowManager.createGroupOrder(
      [customerId, secondCustomer.id],
      'Group Project',
      'A collaborative project',
      milestones
    );
    
    expect(groupOrder.participants.length).toBe(2);
    expect(groupOrder.totalCost.toString()).toBe('1000');
    
    // Contribute funds from both customers
    await escrowManager.contributeFunds(groupOrder.id, customerId, '600');
    await escrowManager.contributeFunds(groupOrder.id, secondCustomer.id, '400');
    
    // Check order status
    const updatedOrder = await escrowManager.getOrder(groupOrder.id);
    expect(updatedOrder.status).toBe(OrderStatus.FUNDED);
    
    // Check contribution tracking
    const contributions = await escrowManager.getOrderContributions(groupOrder.id);
    expect(contributions[customerId].toString()).toBe('600');
    expect(contributions[secondCustomer.id].toString()).toBe('400');
  });
  
  test('should handle complete escrow workflow', async () => {
    // Create order
    const order = await escrowManager.createOrder(
      customerId,
      'Complete Workflow Test',
      'Testing the complete escrow workflow',
      [{ description: 'Full Task', amount: '800' }]
    );
    
    orderId = order.id;
    
    // Fund order
    await escrowManager.contributeFunds(orderId, customerId, '800');
    
    // Assign contractor
    await escrowManager.assignContractor(orderId, contractorId);
    
    // Create DoR document
    const document = await escrowManager.createDocument(
      orderId,
      DocumentType.DEFINITION_OF_READY,
      'Definition of Ready content',
      customerId
    );
    
    // Contractor approves document
    await escrowManager.approveDocument(document.id, contractorId);
    
    // Create discussion
    const discussion = await escrowManager.createDiscussion(
      orderId,
      'Project Discussion',
      contractorId
    );
    
    // Exchange messages
    await escrowManager.sendMessage(
      discussion.id,
      contractorId,
      'Starting work on the task',
      MessageType.TEXT
    );
    
    await escrowManager.sendMessage(
      discussion.id,
      customerId,
      'Great! Looking forward to results',
      MessageType.TEXT
    );
    
    // Mark milestone complete
    const act = await escrowManager.markMilestoneComplete(
      orderId,
      order.milestones[0].id,
      contractorId
    );
    
    // Sign by stakeholders
    await escrowManager.signAct(act.id, contractorId);
    await escrowManager.signAct(act.id, customerId);
    
    // Check order status and contractor balance
    const completedOrder = await escrowManager.getOrder(orderId);
    const contractor = await escrowManager.getUser(contractorId);
    
    expect(completedOrder.status).toBe(OrderStatus.COMPLETED);
    expect(contractor.balance.toString()).toBe('800');
  });
}); 