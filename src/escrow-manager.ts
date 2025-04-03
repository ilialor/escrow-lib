import { EventEmitter } from 'eventemitter3';
import { Decimal } from 'decimal.js';

import { 
  UserService, 
  OrderService, 
  DocumentService, 
  CommunicationService 
} from './services';

import { AIService } from './services/ai-service';

import { 
  IUser, 
  IOrder, 
  IAct, 
  IDocument, 
  IDiscussion, 
  IMessage 
} from './interfaces/base';

import {
  UserType,
  OrderStatus,
  MilestoneStatus,
  DocumentType,
  MessageType
} from './utils/constants';

import {
  IDoRDocument,
  IRoadmapDocument,
  IDoDDocument,
  IDoDComplianceResult
} from './interfaces/services';

/**
 * Events emitted by the EscrowManager
 */
export enum EscrowEvents {
  USER_CREATED = 'user:created',
  USER_BALANCE_CHANGED = 'user:balance_changed',
  
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_FUNDED = 'order:funded',
  ORDER_REPRESENTATIVE_CHANGED = 'order:representative_changed',
  
  MILESTONE_COMPLETED = 'milestone:completed',
  MILESTONE_PAID = 'milestone:paid',
  
  ACT_CREATED = 'act:created',
  ACT_SIGNED = 'act:signed',
  ACT_COMPLETED = 'act:completed',
  
  DOCUMENT_CREATED = 'document:created',
  DOCUMENT_UPDATED = 'document:updated',
  DOCUMENT_APPROVED = 'document:approved',
  
  DISCUSSION_CREATED = 'discussion:created',
  MESSAGE_SENT = 'message:sent',
  
  DOR_GENERATED = 'dor:generated',
  ROADMAP_GENERATED = 'roadmap:generated',
  DOD_GENERATED = 'dod:generated',
  DELIVERABLE_SUBMITTED = 'deliverable:submitted',
  DELIVERABLE_VALIDATED = 'deliverable:validated'
}

/**
 * Main class for managing escrow functionality
 */
export class EscrowManager {
  private userService: UserService;
  private orderService: OrderService;
  private documentService: DocumentService;
  private communicationService: CommunicationService;
  private aiService: AIService | null = null;
  private eventEmitter: EventEmitter;
  
  constructor(aiApiKey?: string) {
    // Initialize services
    this.userService = new UserService();
    this.orderService = new OrderService();
    this.documentService = new DocumentService();
    this.communicationService = new CommunicationService();
    
    // Initialize AI service if API key is provided
    if (aiApiKey) {
      this.aiService = new AIService();
      this.aiService.setApiKey(aiApiKey);
    }
    
    // Set up cross-service dependencies
    this.userService.setOrderService(this.orderService);
    this.orderService.setUserService(this.userService);
    this.documentService.setServices(this.orderService, this.userService, this.aiService || undefined);
    this.communicationService.setServices(this.orderService, this.userService);
    
    // Initialize event emitter
    this.eventEmitter = new EventEmitter();
  }
  
  /**
   * Set Google Gemini API key for AI features
   * @param apiKey Google Gemini API key
   */
  setAiApiKey(apiKey: string): void {
    if (!this.aiService) {
      this.aiService = new AIService();
      this.documentService.setServices(this.orderService, this.userService, this.aiService);
    }
    
    this.aiService.setApiKey(apiKey);
  }
  
  /**
   * Subscribe to events
   * @param event Event type
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: EscrowEvents, callback: (...args: any[]) => void): () => void {
    this.eventEmitter.on(event, callback);
    return () => this.eventEmitter.off(event, callback);
  }
  
  /**
   * Subscribe to an event for one time only
   * @param event Event type
   * @param callback Callback function
   */
  once(event: EscrowEvents, callback: (...args: any[]) => void): void {
    this.eventEmitter.once(event, callback);
  }
  
  /**
   * Emit an event
   * @param event Event type
   * @param args Event arguments
   */
  private emit(event: EscrowEvents, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }
  
  // User Management
  
  /**
   * Create a new user
   * @param name User name
   * @param userType User type
   * @returns Created user
   */
  async createUser(name: string, userType: UserType): Promise<IUser> {
    const user = await this.userService.createUser(name, userType);
    this.emit(EscrowEvents.USER_CREATED, user);
    return user;
  }
  
  /**
   * Get a user by ID
   * @param userId User ID
   * @returns User instance
   */
  async getUser(userId: string): Promise<IUser> {
    return this.userService.getUser(userId);
  }
  
  /**
   * Add funds to a user's balance
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns New balance
   */
  async deposit(userId: string, amount: number | string): Promise<Decimal> {
    const decimalAmount = new Decimal(amount);
    const newBalance = await this.userService.deposit(userId, decimalAmount);
    this.emit(EscrowEvents.USER_BALANCE_CHANGED, { userId, amount: decimalAmount, balance: newBalance });
    return newBalance;
  }
  
  /**
   * Withdraw funds from a user's balance
   * @param userId User ID
   * @param amount Amount to withdraw
   * @returns New balance
   */
  async withdraw(userId: string, amount: number | string): Promise<Decimal> {
    const decimalAmount = new Decimal(amount);
    const newBalance = await this.userService.withdraw(userId, decimalAmount);
    this.emit(EscrowEvents.USER_BALANCE_CHANGED, { userId, amount: decimalAmount.negated(), balance: newBalance });
    return newBalance;
  }
  
  /**
   * Get orders associated with a user
   * @param userId User ID
   * @returns Array of orders
   */
  async getUserOrders(userId: string): Promise<IOrder[]> {
    return this.userService.getUserOrders(userId);
  }
  
  // Order Management
  
  /**
   * Create a new order
   * @param creatorId Creator ID
   * @param title Order title
   * @param description Order description
   * @param milestones Array of milestone data
   * @returns Created order
   */
  async createOrder(
    creatorId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: number | string; deadline?: Date }[]
  ): Promise<IOrder> {
    const order = await this.orderService.createOrder(creatorId, title, description, milestones);
    this.emit(EscrowEvents.ORDER_CREATED, order);
    return order;
  }
  
  /**
   * Create a new group order with multiple participants
   * @param participantIds IDs of the initial participants
   * @param title Order title
   * @param description Order description
   * @param milestones Array of milestone data
   * @returns Created group order
   */
  async createGroupOrder(
    participantIds: string[],
    title: string,
    description: string,
    milestones: { description: string; amount: number | string; deadline?: Date }[]
  ): Promise<IOrder> {
    if (participantIds.length < 2) {
      throw new Error("Group order requires at least two participants");
    }
    
    // Create order with first participant as creator
    const order = await this.orderService.createOrder(participantIds[0], title, description, milestones, true);
    
    // Add other participants to the order
    for (let i = 1; i < participantIds.length; i++) {
      await this.orderService.joinOrder(order.id, participantIds[i], "0");
    }
    
    this.emit(EscrowEvents.ORDER_CREATED, order);
    return order;
  }
  
  /**
   * Get an order by ID
   * @param orderId Order ID
   * @returns Order instance
   */
  async getOrder(orderId: string): Promise<IOrder> {
    return this.orderService.getOrder(orderId);
  }
  
  /**
   * Get the contributions made by participants to an order
   * @param orderId Order ID
   * @returns Map of user IDs to contribution amounts
   */
  async getOrderContributions(orderId: string): Promise<Record<string, Decimal>> {
    return this.orderService.getOrderContributions(orderId);
  }
  
  /**
   * Join an order with initial contribution
   * @param orderId Order ID
   * @param userId User ID
   * @param contribution Initial contribution amount
   * @returns Updated order
   */
  async joinOrder(
    orderId: string,
    userId: string,
    contribution: number | string
  ): Promise<IOrder> {
    const order = await this.orderService.joinOrder(orderId, userId, contribution);
    
    if (order.status === OrderStatus.FUNDED) {
      this.emit(EscrowEvents.ORDER_FUNDED, order);
      this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, status: OrderStatus.FUNDED });
    }
    
    return order;
  }
  
  /**
   * Assign contractor to an order
   * @param orderId Order ID
   * @param contractorId Contractor ID
   * @returns Updated order
   */
  async assignContractor(orderId: string, contractorId: string): Promise<IOrder> {
    return this.orderService.assignContractor(orderId, contractorId);
  }
  
  /**
   * Contribute funds to an order
   * @param orderId Order ID
   * @param userId User ID
   * @param amount Amount to contribute
   * @returns Updated order
   */
  async contributeFunds(
    orderId: string,
    userId: string,
    amount: number | string
  ): Promise<IOrder> {
    const order = await this.orderService.contributeFunds(orderId, userId, amount);
    
    if (order.status === OrderStatus.FUNDED) {
      this.emit(EscrowEvents.ORDER_FUNDED, order);
      this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, status: OrderStatus.FUNDED });
    }
    
    return order;
  }
  
  /**
   * Mark a milestone as complete
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param contractorId Contractor ID
   * @returns Created Act
   */
  async markMilestoneComplete(
    orderId: string,
    milestoneId: string,
    contractorId: string
  ): Promise<IAct> {
    const act = await this.orderService.markMilestoneComplete(orderId, milestoneId, contractorId);
    
    this.emit(EscrowEvents.MILESTONE_COMPLETED, { orderId, milestoneId });
    this.emit(EscrowEvents.ACT_CREATED, act);
    
    const order = await this.getOrder(orderId);
    if (order.status === OrderStatus.IN_PROGRESS) {
      this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, status: OrderStatus.IN_PROGRESS });
    }
    
    return act;
  }
  
  /**
   * Sign an act
   * @param actId Act ID
   * @param userId User ID
   * @returns true if act is now complete, false otherwise
   */
  async signAct(actId: string, userId: string): Promise<boolean> {
    const isComplete = await this.orderService.signAct(actId, userId);
    
    this.emit(EscrowEvents.ACT_SIGNED, { actId, userId });
    
    if (isComplete) {
      this.emit(EscrowEvents.ACT_COMPLETED, { actId });
      
      // Find the order and milestone for this act
      for (const order of await this.getOrdersByStatus(OrderStatus.IN_PROGRESS)) {
        const milestone = order.getMilestones().find(m => m.act?.id === actId);
        if (milestone) {
          this.emit(EscrowEvents.MILESTONE_PAID, { orderId: order.id, milestoneId: milestone.id });
          
          if (order.status === OrderStatus.COMPLETED) {
            this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId: order.id, status: OrderStatus.COMPLETED });
          }
          break;
        }
      }
    }
    
    return isComplete;
  }
  
  /**
   * Vote for a new representative
   * @param orderId Order ID
   * @param voterId Voter ID
   * @param candidateId Candidate ID
   * @returns true if representative changed, false otherwise
   */
  async voteForRepresentative(
    orderId: string,
    voterId: string,
    candidateId: string
  ): Promise<boolean> {
    const changed = await this.orderService.voteForRepresentative(orderId, voterId, candidateId);
    
    if (changed) {
      const order = await this.getOrder(orderId);
      this.emit(EscrowEvents.ORDER_REPRESENTATIVE_CHANGED, { 
        orderId, 
        newRepresentativeId: order.representativeId 
      });
    }
    
    return changed;
  }
  
  /**
   * Get orders by status
   * @param status Order status
   * @returns Array of matching orders
   */
  async getOrdersByStatus(status: OrderStatus): Promise<IOrder[]> {
    return this.orderService.getOrdersByStatus(status);
  }
  
  // Document Management
  
  /**
   * Create a document
   * @param orderId Order ID
   * @param documentType Document type
   * @param content Document content
   * @param createdBy Creator user ID
   * @returns Created document
   */
  async createDocument(
    orderId: string,
    documentType: DocumentType,
    content: string,
    createdBy: string
  ): Promise<IDocument> {
    const document = await this.documentService.createDocument(orderId, documentType, content, createdBy);
    this.emit(EscrowEvents.DOCUMENT_CREATED, document);
    return document;
  }
  
  /**
   * Get a document by ID
   * @param documentId Document ID
   * @returns Document instance
   */
  async getDocument(documentId: string): Promise<IDocument> {
    return this.documentService.getDocument(documentId);
  }
  
  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID
   * @returns true if document is approved, false otherwise
   */
  async approveDocument(documentId: string, userId: string): Promise<boolean> {
    const isApproved = await this.documentService.approveDocument(documentId, userId);
    this.emit(EscrowEvents.DOCUMENT_APPROVED, { documentId, userId, isApproved });
    return isApproved;
  }
  
  /**
   * Update a document
   * @param documentId Document ID
   * @param content New content
   * @param userId User ID
   * @returns Updated document
   */
  async updateDocument(
    documentId: string,
    content: string,
    userId: string
  ): Promise<IDocument> {
    const document = await this.documentService.updateDocument(documentId, content, userId);
    this.emit(EscrowEvents.DOCUMENT_UPDATED, document);
    return document;
  }
  
  /**
   * Get documents for an order
   * @param orderId Order ID
   * @returns Map of document types to documents
   */
  async getDocumentsByOrder(orderId: string): Promise<Map<DocumentType, IDocument>> {
    return this.documentService.getDocumentsByOrder(orderId);
  }
  
  // Communication Management
  
  /**
   * Create a discussion
   * @param orderId Order ID
   * @param title Discussion title
   * @param creatorId Creator user ID
   * @returns Created discussion
   */
  async createDiscussion(
    orderId: string,
    title: string,
    creatorId: string
  ): Promise<IDiscussion> {
    const discussion = await this.communicationService.createDiscussion(orderId, title, creatorId);
    this.emit(EscrowEvents.DISCUSSION_CREATED, discussion);
    return discussion;
  }
  
  /**
   * Get a discussion by ID
   * @param discussionId Discussion ID
   * @returns Discussion instance
   */
  async getDiscussion(discussionId: string): Promise<IDiscussion> {
    return this.communicationService.getDiscussion(discussionId);
  }
  
  /**
   * Get discussions for an order
   * @param orderId Order ID
   * @returns Array of discussions
   */
  async getDiscussionsByOrder(orderId: string): Promise<IDiscussion[]> {
    return this.communicationService.getDiscussionsByOrder(orderId);
  }
  
  /**
   * Send a message
   * @param discussionId Discussion ID
   * @param senderId Sender user ID
   * @param content Message content
   * @param type Message type
   * @param fileUrl Optional file URL for attachments
   * @returns Created message
   */
  async sendMessage(
    discussionId: string,
    senderId: string,
    content: string,
    type: string = MessageType.TEXT,
    fileUrl?: string
  ): Promise<IMessage> {
    const message = await this.communicationService.sendMessage(discussionId, senderId, content, type, fileUrl);
    this.emit(EscrowEvents.MESSAGE_SENT, message);
    return message;
  }
  
  /**
   * Get messages from a discussion
   * @param discussionId Discussion ID
   * @param page Page number
   * @param pageSize Page size
   * @returns Array of messages
   */
  async getMessages(
    discussionId: string,
    page?: number,
    pageSize?: number
  ): Promise<IMessage[]> {
    return this.communicationService.getMessages(discussionId, page, pageSize);
  }
  
  /**
   * Mark a message as read
   * @param messageId Message ID
   * @param userId User ID
   * @returns true if successful
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    return this.communicationService.markMessageAsRead(messageId, userId);
  }
  
  // Document Management with AI
  
  /**
   * Generate a Definition of Ready document for an order
   * @param orderId Order ID
   * @returns Generated DoR document
   */
  async generateDoR(orderId: string): Promise<IDoRDocument> {
    if (!this.aiService) {
      throw new Error('AI service not initialized. Call setAiApiKey() first.');
    }
    
    const order = await this.getOrder(orderId);
    const dorDocument = await this.aiService.generateDoR(order);
    
    // Store the document
    await this.documentService.createDocument(
      'SYSTEM',
      orderId,
      DocumentType.DEFINITION_OF_READY,
      'Definition of Ready',
      dorDocument.content
    );
    
    this.emit(EscrowEvents.DOR_GENERATED, { orderId, dor: dorDocument });
    this.emit(EscrowEvents.DOCUMENT_CREATED, dorDocument);
    
    return dorDocument;
  }
  
  /**
   * Generate a roadmap document for an order
   * @param orderId Order ID
   * @returns Generated roadmap document
   */
  async generateRoadmap(orderId: string): Promise<IRoadmapDocument> {
    if (!this.aiService) {
      throw new Error('AI service not initialized. Call setAiApiKey() first.');
    }
    
    const order = await this.getOrder(orderId);
    const roadmapDocument = await this.aiService.generateRoadmap(order);
    
    // Store the document
    await this.documentService.createDocument(
      'SYSTEM',
      orderId,
      DocumentType.ROADMAP,
      'Project Roadmap',
      roadmapDocument.content
    );
    
    this.emit(EscrowEvents.ROADMAP_GENERATED, { orderId, roadmap: roadmapDocument });
    this.emit(EscrowEvents.DOCUMENT_CREATED, roadmapDocument);
    
    return roadmapDocument;
  }
  
  /**
   * Generate a Definition of Done document for an order
   * @param orderId Order ID
   * @returns Generated DoD document
   */
  async generateDoD(orderId: string): Promise<IDoDDocument> {
    if (!this.aiService) {
      throw new Error('AI service not initialized. Call setAiApiKey() first.');
    }
    
    const order = await this.getOrder(orderId);
    
    // Find roadmap document
    const documents = await this.documentService.getDocumentsByOrderId(orderId);
    let roadmapDocument: IRoadmapDocument | null = null;
    
    for (const doc of documents) {
      if (doc.documentType === DocumentType.ROADMAP) {
        roadmapDocument = doc as IRoadmapDocument;
        break;
      }
    }
    
    if (!roadmapDocument) {
      throw new Error('Roadmap document required to generate Definition of Done');
    }
    
    const dodDocument = await this.aiService.generateDoD(order, roadmapDocument);
    
    // Store the document
    await this.documentService.createDocument(
      'SYSTEM',
      orderId,
      DocumentType.DEFINITION_OF_DONE,
      'Definition of Done',
      dodDocument.content
    );
    
    this.emit(EscrowEvents.DOD_GENERATED, { orderId, dod: dodDocument });
    this.emit(EscrowEvents.DOCUMENT_CREATED, dodDocument);
    
    return dodDocument;
  }
  
  /**
   * Submit a deliverable for a phase of a project
   * @param userId User ID
   * @param orderId Order ID
   * @param phaseId Phase ID
   * @param name Deliverable name
   * @param content Deliverable content
   * @param files Optional files
   * @returns Submitted deliverable document
   */
  async submitDeliverable(
    userId: string,
    orderId: string,
    phaseId: string,
    name: string,
    content: any,
    files?: string[]
  ): Promise<IDocument> {
    const deliverable = await this.documentService.submitDeliverable(
      userId, orderId, phaseId, name, content, files
    );
    
    this.emit(EscrowEvents.DELIVERABLE_SUBMITTED, { 
      orderId, phaseId, deliverable, userId 
    });
    
    return deliverable;
  }
  
  /**
   * Validate deliverables against DoD criteria
   * @param orderId Order ID
   * @param phaseId Phase ID
   * @returns Validation results
   */
  async validateDeliverables(orderId: string, phaseId: string): Promise<IDoDComplianceResult> {
    if (!this.aiService) {
      throw new Error('AI service not initialized. Call setAiApiKey() first.');
    }
    
    const result = await this.documentService.validateDeliverables(orderId, phaseId);
    
    this.emit(EscrowEvents.DELIVERABLE_VALIDATED, {
      orderId,
      phaseId,
      compliant: result.compliant,
      score: result.overallScore
    });
    
    return result;
  }
  
  /**
   * Generate an act for a milestone with specified deliverables
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds IDs of deliverable documents
   * @returns The generated act
   */
  async generateAct(
    orderId: string,
    milestoneId: string,
    deliverableIds: string[]
  ): Promise<IAct> {
    const act = await this.documentService.generateAct(orderId, milestoneId, deliverableIds);
    
    this.emit(EscrowEvents.ACT_CREATED, act);
    
    return act;
  }
  
  /**
   * Sign an act using the document service
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns The updated act
   */
  async signActDocument(actId: string, userId: string): Promise<IAct> {
    const act = await this.documentService.signAct(actId, userId);
    
    this.emit(EscrowEvents.ACT_SIGNED, { actId, userId });
    
    if (act.status === 'completed') {
      this.emit(EscrowEvents.ACT_COMPLETED, { actId });
    }
    
    return act;
  }
  
  /**
   * Set automatic signing timeout for an act
   * @param actId Act ID
   * @param timeoutDays Number of days until auto-signing
   */
  async setupActAutoSigning(actId: string, timeoutDays?: number): Promise<void> {
    await this.documentService.signActWithTimeout(actId, timeoutDays);
  }
} 