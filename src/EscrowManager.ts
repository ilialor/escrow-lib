import EventEmitter from 'eventemitter3';
import { UserService } from './services/UserService';
import { OrderService } from './services/OrderService';
import { DocumentService } from './services/DocumentService';
import { AIService } from './services/AIService';
import { 
  User, UserType, 
  Order, OrderStatus, MilestoneStatus, OrderMilestone,
  Document, DocumentType, Deliverable, ActDocument, ActStatus, 
  DoRContent, RoadmapContent, DoDContent 
} from './interfaces';

/**
 * Main class for managing escrow functionality
 */
export class EscrowManager extends EventEmitter {
  private userService: UserService;
  private orderService: OrderService;
  private documentService: DocumentService;
  private aiService: AIService | null = null;

  /**
   * Constructor for EscrowManager
   * @param apiKey Optional Google Gemini API key for AI-powered features
   */
  constructor(apiKey?: string) {
    super();
    this.userService = new UserService();
    this.orderService = new OrderService();
    this.documentService = new DocumentService();
    
    if (apiKey) {
      this.aiService = new AIService(apiKey, this.orderService, this.documentService);
    }
  }

  // User management methods

  /**
   * Create a new user
   * @param name User name
   * @param type User type
   * @returns Created user
   */
  async createUser(name: string, type: UserType): Promise<User> {
    const user = await this.userService.createUser(name, type);
    this.emit('user:created', user);
    return user;
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User or null if not found
   */
  async getUser(userId: string): Promise<User | null> {
    return this.userService.getUser(userId);
  }

  /**
   * Deposit funds to user's balance
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns Updated user
   */
  async deposit(userId: string, amount: string): Promise<User> {
    const user = await this.userService.deposit(userId, amount);
    this.emit('user:deposit', { userId, amount });
    return user;
  }

  // Order management methods

  /**
   * Create a new order
   * @param customerId Customer ID
   * @param title Order title
   * @param description Order description
   * @param milestones List of milestones
   * @returns Created order
   */
  async createOrder(
    customerId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<Order> {
    const order = await this.orderService.createOrder(customerId, title, description, milestones);
    this.emit('order:created', order);
    return order;
  }

  /**
   * Create a group order with multiple customers
   * @param customerIds List of customer IDs
   * @param title Order title
   * @param description Order description
   * @param milestones List of milestones
   * @returns Created group order
   */
  async createGroupOrder(
    customerIds: string[],
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<Order> {
    const order = await this.orderService.createGroupOrder(customerIds, title, description, milestones);
    this.emit('order:created', order);
    this.emit('group-order:created', order);
    return order;
  }

  /**
   * Get order by ID
   * @param orderId Order ID
   * @returns Order or null if not found
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orderService.getOrder(orderId);
  }

  /**
   * Assign contractor to an order
   * @param orderId Order ID
   * @param contractorId Contractor ID
   * @returns Updated order
   */
  async assignContractor(orderId: string, contractorId: string): Promise<Order> {
    const order = await this.orderService.assignContractor(orderId, contractorId);
    this.emit('order:contractor-assigned', { orderId, contractorId });
    return order;
  }

  /**
   * Contribute funds to an order
   * @param orderId Order ID
   * @param customerId Customer ID
   * @param amount Amount to contribute
   * @returns Updated order
   */
  async contributeFunds(orderId: string, customerId: string, amount: string): Promise<Order> {
    const order = await this.orderService.contributeFunds(orderId, customerId, amount);
    this.emit('order:funds-contributed', { orderId, customerId, amount });
    
    if (order.status === OrderStatus.FUNDED) {
      this.emit('order:funded', order);
    }
    
    return order;
  }

  /**
   * Vote for representative in a group order
   * @param orderId Order ID
   * @param voterId Voter ID
   * @param candidateId Candidate ID
   * @returns true if representative changed, false otherwise
   */
  async voteForRepresentative(orderId: string, voterId: string, candidateId: string): Promise<boolean> {
    const representativeChanged = await this.orderService.voteForRepresentative(orderId, voterId, candidateId);
    
    if (representativeChanged) {
      const order = await this.orderService.getOrder(orderId);
      this.emit('group-order:representative-changed', { 
        orderId, 
        representativeId: candidateId 
      });
    }
    
    return representativeChanged;
  }

  // Document management methods

  /**
   * Create a document
   * @param orderId Order ID
   * @param type Document type
   * @param content Document content
   * @param createdBy Creator's user ID
   * @returns Created document
   */
  async createDocument(
    orderId: string,
    type: DocumentType,
    content: any,
    createdBy: string
  ): Promise<Document> {
    const document = await this.documentService.createDocument(orderId, type, content, createdBy);
    this.emit('document:created', { documentId: document.id, type });
    return document;
  }

  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document or null if not found
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return this.documentService.getDocument(documentId);
  }

  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID approving the document
   * @param comments Optional comments
   * @returns Updated document
   */
  async approveDocument(
    documentId: string,
    userId: string,
    comments?: string
  ): Promise<Document> {
    const document = await this.documentService.approveDocument(documentId, userId, comments);
    this.emit('document:approved', { documentId, userId });
    return document;
  }

  /**
   * Submit a deliverable
   * @param userId User ID submitting the deliverable
   * @param orderId Order ID
   * @param phaseId Optional phase ID from roadmap
   * @param title Deliverable title
   * @param details Optional details
   * @param files Optional list of files
   * @returns Created deliverable
   */
  async submitDeliverable(
    userId: string,
    orderId: string,
    phaseId: string | undefined,
    title: string,
    details?: Record<string, any>,
    files?: string[]
  ): Promise<Deliverable> {
    const deliverable = await this.documentService.submitDeliverable(
      userId,
      orderId,
      phaseId,
      title,
      details,
      files
    );
    this.emit('deliverable:submitted', { deliverableId: deliverable.id, orderId, phaseId });
    return deliverable;
  }

  /**
   * Generate an act document for completed work
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds List of deliverable IDs
   * @returns Created act document
   */
  async generateAct(
    orderId: string,
    milestoneId: string,
    deliverableIds: string[]
  ): Promise<ActDocument> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (!order.contractorId) {
      throw new Error('Order does not have an assigned contractor');
    }

    const act = await this.documentService.createAct(
      orderId,
      milestoneId,
      deliverableIds,
      order.contractorId
    );
    
    this.emit('act:created', { actId: act.id, orderId, milestoneId });
    return act;
  }

  /**
   * Sign an act document
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns Updated act document
   */
  async signActDocument(actId: string, userId: string): Promise<ActDocument> {
    const act = await this.documentService.signAct(actId, userId);
    this.emit('act:signed', { actId, userId });
    
    if (act.status === ActStatus.COMPLETED) {
      this.emit('act:completed', { actId, orderId: act.orderId, milestoneId: act.milestoneId });
      
      // Update milestone status
      await this.orderService.completeMilestone(act.orderId, act.milestoneId);
      this.emit('milestone:completed', { orderId: act.orderId, milestoneId: act.milestoneId });
      
      // Transfer funds if act is completed
      // This would be implemented in a real system
    }
    
    return act;
  }

  // AI-powered document methods

  /**
   * Generate a Definition of Ready document using AI
   * @param orderId Order ID
   * @returns Generated DoR document
   */
  async generateDoR(orderId: string): Promise<Document> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    const document = await this.aiService.generateDoR(orderId);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.DEFINITION_OF_READY });
    return document;
  }

  /**
   * Generate a Roadmap document using AI
   * @param orderId Order ID
   * @returns Generated Roadmap document
   */
  async generateRoadmap(orderId: string): Promise<Document> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    const document = await this.aiService.generateRoadmap(orderId);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.ROADMAP });
    return document;
  }

  /**
   * Generate a Definition of Done document using AI
   * @param orderId Order ID
   * @returns Generated DoD document
   */
  async generateDoD(orderId: string): Promise<Document> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    const document = await this.aiService.generateDoD(orderId);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.DEFINITION_OF_DONE });
    return document;
  }

  /**
   * Validate deliverables against DoD criteria using AI
   * @param orderId Order ID
   * @param phaseId Optional phase ID to validate specific phase
   * @returns Validation result
   */
  async validateDeliverables(orderId: string, phaseId?: string): Promise<{
    compliant: boolean;
    feedback: string;
    suggestions?: string[];
  }> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    const result = await this.aiService.validateDeliverables(orderId, phaseId);
    this.emit('validation:completed', { orderId, phaseId, result });
    return result;
  }

  /**
   * Generate a specification document using AI
   * @param orderId Order ID
   * @param title Title of the specification
   * @param description Description or outline of what to include
   * @returns Generated specification document
   */
  async generateSpecification(orderId: string, title: string, description: string): Promise<Document> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    const document = await this.aiService.generateSpecification(orderId, title, description);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.SPECIFICATION });
    return document;
  }
} 