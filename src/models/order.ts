import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { IOrder, IMilestone, IDocument, IAct } from '../interfaces/base';
import { Milestone } from './milestone';
import { OrderStatus, MilestoneStatus, DocumentType, REP_VOTE_THRESHOLD_PERCENT } from '../utils/constants';

/**
 * Order class representing a group order with milestones
 */
export class Order implements IOrder {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  contractorId?: string;
  representativeId: string;
  milestones: Milestone[];
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

  constructor(
    creatorId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: number | string; deadline?: Date }[],
    isGroupOrder: boolean = false
  ) {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
    this.creatorId = creatorId;
    this.representativeId = creatorId; // Initially, creator is the representative
    this.isGroupOrder = isGroupOrder;
    this.participants = [creatorId]; // Initially just the creator
    
    // Convert milestone data to Milestone objects
    this.milestones = milestones.map(
      m => new Milestone(m.description, m.amount, m.deadline)
    );
    
    // Calculate total cost
    this.totalCost = this.milestones.reduce(
      (sum, milestone) => sum.plus(milestone.amount),
      new Decimal(0)
    );
    
    this.escrowBalance = new Decimal(0);
    this.status = OrderStatus.CREATED;
    this.contributors = new Map<string, Decimal>();
    this.votes = new Map<string, string>();
    this.documents = new Map<DocumentType, IDocument>();
    this.dateCreated = new Date();
    this.dateUpdated = new Date();
  }

  /**
   * Add contribution to the order's escrow balance
   * @param userId ID of the contributing user
   * @param amount Amount to contribute
   */
  addContribution(userId: string, amount: Decimal): void {
    // Update escrow balance
    this.escrowBalance = this.escrowBalance.plus(amount);
    
    // Record contribution
    const currentContribution = this.contributors.get(userId) || new Decimal(0);
    this.contributors.set(userId, currentContribution.plus(amount));
    
    // Add user to participants if not already present
    if (!this.participants.includes(userId)) {
      this.participants.push(userId);
    }
    
    // Check if the order is now fully funded
    if (this.escrowBalance.greaterThanOrEqualTo(this.totalCost) && 
        this.status === OrderStatus.CREATED) {
      this.status = OrderStatus.FUNDED;
    }
    
    this.dateUpdated = new Date();
  }

  /**
   * Mark milestone as complete by contractor
   * @param milestoneId ID of the milestone to mark complete
   * @returns The created Act
   */
  markMilestoneCompleteByContractor(milestoneId: string): IAct {
    if (!this.contractorId) {
      throw new Error('No contractor assigned to this order');
    }
    
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }
    
    if (milestone.status !== MilestoneStatus.PENDING) {
      throw new Error(`Milestone already in ${milestone.status} state`);
    }
    
    milestone.markAsCompleted();
    const act = milestone.createAct();
    
    // Update order status if it was previously just FUNDED
    if (this.status === OrderStatus.FUNDED) {
      this.status = OrderStatus.IN_PROGRESS;
    }
    
    this.dateUpdated = new Date();
    return act;
  }

  /**
   * Release funds for a completed milestone
   * @param milestoneId ID of the milestone to release funds for
   * @returns Amount released
   */
  releaseFundsForMilestone(milestoneId: string): Decimal {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }
    
    if (milestone.status !== MilestoneStatus.COMPLETED) {
      throw new Error('Milestone is not completed');
    }
    
    if (!milestone.act?.isComplete()) {
      throw new Error('Act is not fully signed');
    }
    
    if (this.escrowBalance.lessThan(milestone.amount)) {
      throw new Error('Insufficient funds in escrow');
    }
    
    // Update balances
    this.escrowBalance = this.escrowBalance.minus(milestone.amount);
    milestone.markAsPaid();
    
    // Check if all milestones are paid, which means the order is completed
    const allMilestonesPaid = this.milestones.every(
      m => m.status === MilestoneStatus.PAID
    );
    
    if (allMilestonesPaid) {
      this.status = OrderStatus.COMPLETED;
    }
    
    this.dateUpdated = new Date();
    return milestone.amount;
  }

  /**
   * Add a vote for a new representative
   * @param voterId ID of the voter
   * @param candidateId ID of the candidate
   */
  addVote(voterId: string, candidateId: string): void {
    // Check if user is a contributor
    if (!this.contributors.has(voterId)) {
      throw new Error('Only contributors can vote');
    }
    
    // Record the vote
    this.votes.set(voterId, candidateId);
    
    // Check if the vote threshold is reached
    this.checkVotes();
    
    this.dateUpdated = new Date();
  }

  /**
   * Check if there are enough votes to change the representative
   * @returns true if representative was changed, false otherwise
   */
  checkVotes(): boolean {
    // Count votes for each candidate
    const voteCounts = new Map<string, Decimal>();
    let totalVoted = new Decimal(0);
    
    this.votes.forEach((candidateId, voterId) => {
      const voterContribution = this.contributors.get(voterId) || new Decimal(0);
      const candidateVotes = voteCounts.get(candidateId) || new Decimal(0);
      
      voteCounts.set(candidateId, candidateVotes.plus(voterContribution));
      totalVoted = totalVoted.plus(voterContribution);
    });
    
    // Find candidate with highest vote weight
    let topCandidate: string | undefined;
    let topVotes = new Decimal(0);
    
    voteCounts.forEach((votes, candidateId) => {
      if (votes.greaterThan(topVotes)) {
        topVotes = votes;
        topCandidate = candidateId;
      }
    });
    
    if (!topCandidate) return false;
    
    // Check if top candidate has reached threshold percentage
    const thresholdAmount = this.totalCost
      .times(REP_VOTE_THRESHOLD_PERCENT)
      .dividedBy(100);
    
    if (topVotes.greaterThanOrEqualTo(thresholdAmount)) {
      // Change representative
      this.representativeId = topCandidate;
      this.votes.clear(); // Reset votes after change
      return true;
    }
    
    return false;
  }

  /**
   * Get order status
   */
  getStatus(): OrderStatus {
    return this.status;
  }

  /**
   * Get all milestones
   */
  getMilestones(): IMilestone[] {
    return this.milestones;
  }
} 