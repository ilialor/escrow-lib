import { ICommunicationService } from '../interfaces/services';
import { IMessage, IDiscussion } from '../interfaces/base';
import { Message, Discussion } from '../models/communication';
import { MessageType, DEFAULT_PAGE_SIZE } from '../utils/constants';

/**
 * Service for managing discussions and messages between order participants
 */
export class CommunicationService implements ICommunicationService {
  private discussions: Map<string, IDiscussion>;
  private messages: Map<string, IMessage>;
  private orderService: any; // Will be set via setOrderService method
  private userService: any; // Will be set via setUserService method
  
  constructor() {
    this.discussions = new Map<string, IDiscussion>();
    this.messages = new Map<string, IMessage>();
  }
  
  /**
   * Set service instances for cross-service communication
   * @param orderService OrderService instance
   * @param userService UserService instance
   */
  setServices(orderService: any, userService: any): void {
    this.orderService = orderService;
    this.userService = userService;
  }

  /**
   * Create a new discussion thread
   * @param orderId Order ID
   * @param title Discussion title
   * @param creatorId User ID of the creator
   * @returns Created discussion
   */
  async createDiscussion(
    orderId: string, 
    title: string, 
    creatorId: string
  ): Promise<IDiscussion> {
    // Validate inputs
    if (!this.orderService) {
      throw new Error('Order service not initialized');
    }
    
    // Check if order exists
    const order = await this.orderService.getOrder(orderId);
    
    // Check if user exists and is related to the order
    if (this.userService) {
      const user = await this.userService.getUser(creatorId);
      
      // Check if user is related to the order (customer, representative, or contractor)
      const isCustomer = order.contributors.has(creatorId);
      const isRepresentative = order.representativeId === creatorId;
      const isContractor = order.contractorId === creatorId;
      
      if (!isCustomer && !isRepresentative && !isContractor) {
        throw new Error('Only order participants can create discussions');
      }
    }
    
    // Create discussion
    const discussion = new Discussion(orderId, title, creatorId);
    this.discussions.set(discussion.id, discussion);
    
    return discussion;
  }

  /**
   * Get discussion by ID
   * @param discussionId Discussion ID
   * @returns Discussion instance
   */
  async getDiscussion(discussionId: string): Promise<IDiscussion> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }
    return discussion;
  }

  /**
   * Get all discussions for an order
   * @param orderId Order ID
   * @returns Array of discussions
   */
  async getDiscussionsByOrder(orderId: string): Promise<IDiscussion[]> {
    const result: IDiscussion[] = [];
    
    for (const discussion of this.discussions.values()) {
      if (discussion.orderId === orderId) {
        result.push(discussion);
      }
    }
    
    // Sort by last update (newest first)
    return result.sort((a, b) => b.dateUpdated.getTime() - a.dateUpdated.getTime());
  }

  /**
   * Send a message to a discussion
   * @param discussionId Discussion ID
   * @param senderId User ID of the sender
   * @param content Message content
   * @param type Message type
   * @param fileUrl Optional URL for FILE type messages
   * @returns Created message
   */
  async sendMessage(
    discussionId: string, 
    senderId: string, 
    content: string, 
    type: string = MessageType.TEXT,
    fileUrl?: string
  ): Promise<IMessage> {
    // Validate inputs
    const discussion = await this.getDiscussion(discussionId);
    
    // Check if user exists and is related to the order
    if (this.userService && this.orderService) {
      const user = await this.userService.getUser(senderId);
      const order = await this.orderService.getOrder(discussion.orderId);
      
      // Check if user is related to the order
      const isCustomer = order.contributors.has(senderId);
      const isRepresentative = order.representativeId === senderId;
      const isContractor = order.contractorId === senderId;
      
      if (!isCustomer && !isRepresentative && !isContractor) {
        throw new Error('Only order participants can send messages');
      }
    }
    
    // Create message
    const messageType = type as MessageType;
    const message = new Message(discussion.orderId, senderId, content, messageType, fileUrl);
    
    // Add message to discussion
    discussion.addMessage(message);
    this.messages.set(message.id, message);
    
    return message;
  }

  /**
   * Get messages from a discussion
   * @param discussionId Discussion ID
   * @param page Page number (optional)
   * @param pageSize Page size (optional)
   * @returns Array of messages
   */
  async getMessages(
    discussionId: string, 
    page: number = 0, 
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<IMessage[]> {
    const discussion = await this.getDiscussion(discussionId);
    return discussion.getMessages(page, pageSize);
  }

  /**
   * Mark a message as read by a user
   * @param messageId Message ID
   * @param userId User ID
   * @returns true if marked as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }
    
    message.markAsRead(userId);
    return true;
  }
} 