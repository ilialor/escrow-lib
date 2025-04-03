import { EventEmitter } from 'eventemitter3';
import { Decimal } from 'decimal.js';

import { 
  UserService, 
  OrderService, 
  DocumentService, 
  CommunicationService 
} from './services';

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
  MESSAGE_SENT = 'message:sent'
}

/**
 * Main class for managing escrow functionality
 */
export class EscrowManager {
  private userService: UserService;
  private orderService: OrderService;
  private documentService: DocumentService;
  private communicationService: CommunicationService;
  private eventEmitter: EventEmitter;
  
  constructor() {
    // Initialize services
    this.userService = new UserService();
    this.orderService = new OrderService();
    this.documentService = new DocumentService();
    this.communicationService = new CommunicationService();
    
    // Set up cross-service dependencies
    this.userService.setOrderService(this.orderService);
    this.orderService.setUserService(this.userService);
    this.documentService.setServices(this.orderService, this.userService);
    this.communicationService.setServices(this.orderService, this.userService);
    
    // Initialize event emitter
    this.eventEmitter = new EventEmitter();
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
   * Get an order by ID
   * @param orderId Order ID
   * @returns Order instance
   */
  async getOrder(orderId: string): Promise<IOrder> {
    return this.orderService.getOrder(orderId);
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
} 