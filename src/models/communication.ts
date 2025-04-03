import { v4 as uuidv4 } from 'uuid';
import { IMessage, IDiscussion } from '../interfaces/base';
import { MessageType, DEFAULT_PAGE_SIZE, MAX_MESSAGE_LENGTH } from '../utils/constants';

/**
 * Message class representing a message in a discussion
 */
export class Message implements IMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  dateCreated: Date;
  readBy: Set<string>;

  constructor(
    orderId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    fileUrl?: string,
    id?: string
  ) {
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters`);
    }
    
    this.id = id || uuidv4();
    this.orderId = orderId;
    this.senderId = senderId;
    this.content = content;
    this.type = type;
    this.fileUrl = fileUrl;
    this.dateCreated = new Date();
    this.readBy = new Set<string>([senderId]); // Sender has read their own message
  }

  /**
   * Mark message as read by user
   * @param userId ID of the user who read the message
   */
  markAsRead(userId: string): void {
    this.readBy.add(userId);
  }
}

/**
 * Discussion class representing a thread of messages
 */
export class Discussion implements IDiscussion {
  id: string;
  orderId: string;
  title: string;
  messages: IMessage[];
  participants: Set<string>;
  dateCreated: Date;
  dateUpdated: Date;

  constructor(
    orderId: string,
    title: string,
    creatorId: string,
    id?: string
  ) {
    this.id = id || uuidv4();
    this.orderId = orderId;
    this.title = title;
    this.messages = [];
    this.participants = new Set<string>([creatorId]);
    this.dateCreated = new Date();
    this.dateUpdated = new Date();
  }

  /**
   * Add message to the discussion
   * @param message Message to add
   */
  addMessage(message: IMessage): void {
    // Add sender to participants if not already there
    this.participants.add(message.senderId);
    
    // Add message
    this.messages.push(message);
    
    // Update timestamp
    this.dateUpdated = new Date();
  }

  /**
   * Get messages with optional pagination
   * @param page Page number (0-based)
   * @param pageSize Number of messages per page
   * @returns Array of messages for the requested page
   */
  getMessages(page: number = 0, pageSize: number = DEFAULT_PAGE_SIZE): IMessage[] {
    const start = page * pageSize;
    const end = start + pageSize;
    
    // Sort messages by creation date (newest first) and apply pagination
    return [...this.messages]
      .sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime())
      .slice(start, end);
  }

  /**
   * Add participant to the discussion
   * @param userId ID of the user to add
   */
  addParticipant(userId: string): void {
    this.participants.add(userId);
  }
} 