import { Decimal } from 'decimal.js';
import { UserType, OrderStatus, MilestoneStatus, DocumentType, MessageType, ActStatus } from '../utils/constants';

export interface IUser {
  id: string;
  name: string;
  balance: Decimal;
  userType: UserType;
  getBalance(): Decimal;
  updateBalance(amount: Decimal): void;
}

export interface IMilestone {
  id: string;
  description: string;
  amount: Decimal;
  status: MilestoneStatus;
  deadline?: Date;
  act?: IAct;
  markAsCompleted(): void;
  createAct(orderId: string, relatedDeliverables?: string[]): IAct;
  markAsPaid(): void;
}

export interface IAct {
  id: string;
  milestoneId: string;
  orderId: string;
  signatures: Set<string>;
  dateCreated: Date;
  dateSigned?: Date;
  status: ActStatus;
  deadline: Date;
  relatedDeliverables: string[];
  addSignature(userId: string): boolean;
  isComplete(): boolean;
}

export interface IOrder {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  contractorId?: string;
  representativeId: string;
  milestones: IMilestone[];
  totalCost: Decimal;
  escrowBalance: Decimal;
  status: OrderStatus;
  contributors: Map<string, Decimal>;
  votes: Map<string, string>;
  documents: Map<DocumentType, IDocument>;
  dateCreated: Date;
  dateUpdated: Date;
  isGroupOrder: boolean;
  participants: string[];
  
  addContribution(userId: string, amount: Decimal): void;
  markMilestoneCompleteByContractor(milestoneId: string): IAct;
  releaseFundsForMilestone(milestoneId: string): Decimal;
  addVote(voterId: string, candidateId: string): void;
  checkVotes(): boolean;
  getStatus(): OrderStatus;
  getMilestones(): IMilestone[];
}

export interface IDocument {
  id: string;
  orderId: string;
  documentType: DocumentType;
  content: any;
  version: number;
  createdBy: string;
  dateCreated: Date;
  dateUpdated: Date;
  approvals: Set<string>;
  name?: string;
  files?: string[];
  
  approve(userId: string): void;
  isApproved(): boolean;
  updateContent(content: any, userId: string): void;
}

export interface IMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  dateCreated: Date;
  readBy: Set<string>;
  
  markAsRead(userId: string): void;
}

export interface IDiscussion {
  id: string;
  orderId: string;
  title: string;
  messages: IMessage[];
  participants: Set<string>;
  dateCreated: Date;
  dateUpdated: Date;
  
  addMessage(message: IMessage): void;
  getMessages(page?: number, pageSize?: number): IMessage[];
  addParticipant(userId: string): void;
} 