import { Decimal } from 'decimal.js';
import {
  IUser,
  IOrder,
  IMilestone,
  IAct,
  IDocument,
  IMessage,
  IDiscussion
} from './base';
import { DocumentType, OrderStatus, UserType } from '../utils/constants';

export interface IUserService {
  createUser(name: string, userType: UserType): Promise<IUser>;
  getUser(userId: string): Promise<IUser>;
  deposit(userId: string, amount: Decimal): Promise<Decimal>;
  withdraw(userId: string, amount: Decimal): Promise<Decimal>;
  getUserOrders(userId: string): Promise<IOrder[]>;
}

export interface IOrderService {
  createOrder(
    creatorId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: number | string; deadline?: Date }[],
    isGroupOrder?: boolean
  ): Promise<IOrder>;
  
  getOrder(orderId: string): Promise<IOrder>;
  
  getOrderContributions(orderId: string): Promise<Record<string, Decimal>>;
  
  joinOrder(
    orderId: string,
    userId: string,
    contribution: number | string
  ): Promise<IOrder>;
  
  assignContractor(orderId: string, contractorId: string): Promise<IOrder>;
  
  contributeFunds(
    orderId: string,
    userId: string,
    amount: number | string
  ): Promise<IOrder>;
  
  markMilestoneComplete(
    orderId: string,
    milestoneId: string,
    contractorId: string
  ): Promise<IAct>;
  
  signAct(actId: string, userId: string): Promise<boolean>;
  
  voteForRepresentative(
    orderId: string,
    voterId: string,
    candidateId: string
  ): Promise<boolean>;
  
  getOrdersByStatus(status: OrderStatus): Promise<IOrder[]>;
}

export interface IDocumentService {
  createDocument(
    orderId: string,
    documentType: DocumentType,
    content: string,
    createdBy: string
  ): Promise<IDocument>;
  
  getDocument(documentId: string): Promise<IDocument>;
  
  approveDocument(documentId: string, userId: string): Promise<boolean>;
  
  updateDocument(
    documentId: string,
    content: string,
    userId: string
  ): Promise<IDocument>;
  
  getDocumentsByOrder(orderId: string): Promise<Map<DocumentType, IDocument>>;
}

export interface ICommunicationService {
  createDiscussion(
    orderId: string,
    title: string,
    creatorId: string
  ): Promise<IDiscussion>;
  
  getDiscussion(discussionId: string): Promise<IDiscussion>;
  
  getDiscussionsByOrder(orderId: string): Promise<IDiscussion[]>;
  
  sendMessage(
    discussionId: string,
    senderId: string,
    content: string,
    type?: string,
    fileUrl?: string
  ): Promise<IMessage>;
  
  getMessages(
    discussionId: string,
    page?: number,
    pageSize?: number
  ): Promise<IMessage[]>;
  
  markMessageAsRead(messageId: string, userId: string): Promise<boolean>;
} 