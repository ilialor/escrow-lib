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

  submitDeliverable(
    orderId: string,
    milestoneId: string,
    content: string,
    type: string,
    createdBy: string
  ): Promise<IDocument>;

  validateDeliverables(
    orderId: string,
    milestoneId: string
  ): Promise<{ valid: boolean; report: any }>;

  generateAct(
    orderId: string,
    milestoneId: string,
    contractorId: string
  ): Promise<IAct>;

  signActWithTimeout(
    actId: string,
    userId: string,
    timeoutDays: number
  ): Promise<{
    isComplete: boolean;
    platformSigned?: boolean;
    signatures: string[];
  }>;

  createDocument(userId: string, orderId: string, type: string, name: string, content: any): Promise<IDocument>;
  getDocumentsByOrderId(orderId: string): Promise<IDocument[]>;
  getDocumentById(documentId: string): Promise<IDocument | null>;
  updateDocument(documentId: string, updates: Partial<IDocument>): Promise<IDocument>;
  
  submitDeliverable(userId: string, orderId: string, phaseId: string, name: string, content: any, files?: string[]): Promise<IDocument>;
  validateDeliverables(orderId: string, phaseId: string): Promise<IDoDComplianceResult>;
  generateAct(orderId: string, milestoneId: string, deliverableIds: string[]): Promise<IAct>;
  signAct(actId: string, userId: string): Promise<IAct>;
  getActById(actId: string): Promise<IAct | null>;
  getActsByOrderId(orderId: string): Promise<IAct[]>;
  signActWithTimeout(actId: string, timeoutDays: number): Promise<void>;
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

/**
 * Интерфейс для взаимодействия с ИИ сервисами
 */
export interface IAIService {
  setApiKey(apiKey: string): void;
  generateDoR(order: IOrder): Promise<IDoRDocument>;
  generateRoadmap(order: IOrder): Promise<IRoadmapDocument>;
  generateDoD(order: IOrder, roadmap: IRoadmapDocument): Promise<IDoDDocument>;
  checkDoD(deliverables: IDocument[], dod: IDoDDocument): Promise<IDoDComplianceResult>;
  autoFillForm(order: IOrder, formType: string, additionalData?: any): Promise<any>;
}

export interface IDoDComplianceResult {
  compliant: boolean;
  details: {
    criterionId: string;
    description: string;
    compliant: boolean;
    reason?: string;
  }[];
  overallScore: number;
  recommendations?: string[];
}

export interface IDoRDocument extends IDocument {
  content: {
    format: string;
    volume: string;
    resources: string[];
    recommendations: string[];
    timeline: string;
    risks: string[];
  };
}

export interface IRoadmapDocument extends IDocument {
  content: {
    phases: {
      id: string;
      name: string;
      description: string;
      deliverables: string[];
      estimatedDuration: string;
      dependsOn?: string[];
    }[];
  };
}

export interface IDoDDocument extends IDocument {
  content: {
    criteria: {
      id: string;
      description: string;
      checkMethod: string;
      phaseId: string;
    }[];
  };
}

export interface IAct extends IDocument {
  status: string;
  signatures: {
    userType: string;
    userId: string;
    signedAt?: Date;
  }[];
  deadline: Date;
  relatedDeliverables: string[]; // Document IDs
} 