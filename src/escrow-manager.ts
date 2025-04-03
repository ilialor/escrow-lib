import EventEmitter from 'eventemitter3';
import { UserService } from './services/user-service';
import { OrderService } from './services/order-service';
import { DocumentService } from './services/document-service';
import { AIService } from './services/ai-service';
import { Decimal } from 'decimal.js';
import { 
  IUser, 
  IOrder, 
  IDocument, 
  IAct
} from './interfaces/base';
import { 
  DoRContent, 
  RoadmapContent, 
  DoDContent 
} from './interfaces/DocumentInterfaces';
import { UserType, OrderStatus, DocumentType, ActStatus } from './utils/constants';

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
      this.aiService = new AIService();
    }
  }

  // User management methods

  /**
   * Create a new user
   * @param name User name
   * @param type User type
   * @returns Created user (IUser)
   */
  async createUser(name: string, type: UserType): Promise<IUser> {
    const user = await this.userService.createUser(name, type);
    this.emit('user:created', user);
    return user;
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User (IUser) or null if not found
   */
  async getUser(userId: string): Promise<IUser | null> {
    const user = await this.userService.getUser(userId);
    return user ? user : null;
  }

  /**
   * Deposit funds to user's balance
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns Updated user (IUser)
   */
  async deposit(userId: string, amount: string): Promise<IUser> {
    const decimalAmount = new Decimal(amount);
    await this.userService.deposit(userId, decimalAmount);
    this.emit('user:deposit', { userId, amount });
    
    const updatedUser = await this.userService.getUser(userId);
    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found after deposit.`);
    }
    return updatedUser;
  }

  // Order management methods

  /**
   * Create a new order
   * @param customerId Customer ID
   * @param title Order title
   * @param description Order description
   * @param milestones List of milestones
   * @returns Created order (IOrder)
   */
  async createOrder(
    customerId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<IOrder> {
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
   * @returns Created group order (IOrder)
   */
  async createGroupOrder(
    customerIds: string[],
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<IOrder> {
    const serviceMilestones = milestones.map(m => ({ 
      ...m, 
      amount: m.amount
    }));
    const order = await this.orderService.createGroupOrder(customerIds, title, description, serviceMilestones);
    this.emit('order:created', order);
    this.emit('group-order:created', order);
    return order; 
  }

  /**
   * Get order by ID
   * @param orderId Order ID
   * @returns Order (IOrder) or null if not found
   */
  async getOrder(orderId: string): Promise<IOrder | null> {
    const order = await this.orderService.getOrder(orderId);
    return order ? order : null;
  }

  /**
   * Assign contractor to an order
   * @param orderId Order ID
   * @param contractorId Contractor ID
   * @returns Updated order (IOrder)
   */
  async assignContractor(orderId: string, contractorId: string): Promise<IOrder> {
    const order = await this.orderService.assignContractor(orderId, contractorId);
    this.emit('order:contractor-assigned', { orderId, contractorId });
    return order;
  }

  /**
   * Contribute funds to an order
   * @param orderId Order ID
   * @param customerId Customer ID
   * @param amount Amount to contribute
   * @returns Updated order (IOrder)
   */
  async contributeFunds(orderId: string, customerId: string, amount: string): Promise<IOrder> {
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
   * @param name Document name (required by underlying service)
   * @param content Document content
   * @param createdBy Creator's user ID
   * @returns Created document (IDocument)
   */
  async createDocument(
    orderId: string,
    type: DocumentType,
    name: string,
    content: any,
    createdBy: string
  ): Promise<IDocument> {
    const document = await this.documentService.createDocument(
      createdBy, 
      orderId, 
      type, 
      name, 
      content
    );
    this.emit('document:created', { documentId: document.id, type });
    return document;
  }

  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document (IDocument) or null if not found
   */
  async getDocument(documentId: string): Promise<IDocument | null> {
    const document = await this.documentService.getDocument(documentId);
    return document ? document : null;
  }

  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID approving the document
   * @param comments Optional comments
   * @returns Updated document (IDocument) or null
   */
  async approveDocument(
    documentId: string,
    userId: string,
    comments?: string
  ): Promise<IDocument | null> {
    const approved = await this.documentService.approveDocument(documentId, userId);
    if (approved) {
      this.emit('document:approved', { documentId, userId });
      const updatedDoc = await this.getDocument(documentId);
      return updatedDoc ? updatedDoc : null;
    } else {
      console.warn(`Document ${documentId} approval failed or returned false.`);
      return null;
    }
  }

  /**
   * Submit a deliverable
   * @param userId User ID submitting the deliverable
   * @param orderId Order ID
   * @param phaseId Optional phase ID from roadmap
   * @param title Deliverable title
   * @param details Optional details
   * @param files Optional list of files
   * @returns Created deliverable (IDocument)
   */
  async submitDeliverable(
    userId: string,
    orderId: string,
    phaseId: string | undefined,
    title: string,
    details?: Record<string, any>,
    files?: string[]
  ): Promise<IDocument> {
    if (phaseId === undefined) {
      throw new Error('phaseId cannot be undefined when submitting a deliverable needing it.');
    }
    const deliverableDoc = await this.documentService.submitDeliverable(
      userId,
      orderId,
      phaseId,
      title,
      details,
      files
    );
    this.emit('deliverable:submitted', { deliverableId: deliverableDoc.id, orderId, phaseId });
    return deliverableDoc;
  }

  /**
   * Generate an act document for completed work
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds List of deliverable IDs
   * @returns Created act document (IAct)
   */
  async generateAct(
    orderId: string,
    milestoneId: string,
    deliverableIds: string[]
  ): Promise<IAct> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (!order.contractorId) {
      throw new Error('Order does not have an assigned contractor');
    }

    const act = await this.documentService.generateAct(orderId, milestoneId, deliverableIds); 
    if (!act) {
        throw new Error('Failed to generate Act document.'); // Or handle null appropriately
    }
    this.emit('act:generated', { actId: act.id, orderId, milestoneId });
    return act;
  }

  /**
   * Sign an act document
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns Updated act document (IAct)
   */
  async signActDocument(actId: string, userId: string): Promise<IAct> {
    const act = await this.documentService.signAct(actId, userId);
    this.emit('act:signed', { actId, userId });
    
    return act;
  }

  // AI-powered document methods

  /**
   * Generate a Definition of Ready document using AI
   * @param orderId Order ID
   * @returns Generated DoR document (IDocument)
   */
  async generateDoR(orderId: string): Promise<IDocument> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    const document = await this.aiService.generateDoR(order);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.DEFINITION_OF_READY });
    return document;
  }

  /**
   * Generate a Roadmap document using AI
   * @param orderId Order ID
   * @returns Generated Roadmap document (IDocument)
   */
  async generateRoadmap(orderId: string): Promise<IDocument> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    const document = await this.aiService.generateRoadmap(order);
    this.emit('document:generated', { documentId: document.id, type: DocumentType.ROADMAP });
    return document;
  }

  /**
   * Generate a Definition of Done document using AI
   * @param orderId Order ID
   * @returns Generated DoD document (IDocument)
   */
  async generateDoD(orderId: string): Promise<IDocument> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    // Get the order
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Get the Roadmap document for this order
    // Assuming DocumentService has a method like getDocumentByTypeAndOrder
    // Or we find it manually from the list of documents for the order.
    // For simplicity, let's assume DocumentService has getDocumentsByOrderId
    const documents = await this.documentService.getDocumentsByOrderId(orderId);
    const roadmapDoc = documents.find(doc => doc.documentType === DocumentType.ROADMAP);

    if (!roadmapDoc) {
        throw new Error(`Roadmap document not found for order ${orderId}. Cannot generate DoD.`);
    }

    // Call aiService.generateDoD with both order and roadmap
    const dodDocument = await this.aiService.generateDoD(order, roadmapDoc as any); // Cast roadmapDoc if needed
    this.emit('document:generated', { documentId: dodDocument.id, type: DocumentType.DEFINITION_OF_DONE });
    return dodDocument;
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
    
    throw new Error('aiService.validateDeliverables method not implemented or available.');
  }

  /**
   * Generate a specification document using AI
   * @param orderId Order ID
   * @param title Title of the specification
   * @param description Description or outline of what to include
   * @returns Generated specification document (IDocument)
   */
  async generateSpecification(orderId: string, title: string, description: string): Promise<IDocument> {
    if (!this.aiService) {
      throw new Error('AI service is not initialized. Provide API key in constructor');
    }
    
    throw new Error('aiService.generateSpecification method not implemented or available.');
  }
} 