import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { IMilestone, IAct } from '../interfaces/base';
import { MilestoneStatus } from '../utils/constants';
import { MIN_SIGNATURES_REQUIRED } from '../utils/constants';

/**
 * Act of milestone completion
 */
export class Act implements IAct {
  id: string;
  milestoneId: string;
  signatures: Set<string>;
  dateCreated: Date;
  dateSigned?: Date;

  constructor(milestoneId: string, id?: string) {
    this.id = id || uuidv4();
    this.milestoneId = milestoneId;
    this.signatures = new Set<string>();
    this.dateCreated = new Date();
  }

  /**
   * Add signature to the act
   * @param userId ID of the user signing the act
   * @returns true if signatures are now complete, false otherwise
   */
  addSignature(userId: string): boolean {
    if (this.signatures.has(userId)) {
      return this.isComplete();
    }

    this.signatures.add(userId);
    
    if (this.isComplete() && !this.dateSigned) {
      this.dateSigned = new Date();
    }
    
    return this.isComplete();
  }

  /**
   * Check if the act has enough signatures to be considered complete
   */
  isComplete(): boolean {
    return this.signatures.size >= MIN_SIGNATURES_REQUIRED;
  }
}

/**
 * Milestone representing a single task in an order
 */
export class Milestone implements IMilestone {
  id: string;
  description: string;
  amount: Decimal;
  status: MilestoneStatus;
  deadline?: Date;
  act?: Act;

  constructor(
    description: string,
    amount: number | string,
    deadline?: Date,
    id?: string,
    status: MilestoneStatus = MilestoneStatus.PENDING
  ) {
    this.id = id || uuidv4();
    this.description = description;
    this.amount = new Decimal(amount);
    this.status = status;
    this.deadline = deadline;
  }

  /**
   * Mark milestone as completed
   */
  markAsCompleted(): void {
    if (this.status !== MilestoneStatus.PENDING) {
      throw new Error(`Cannot complete milestone in ${this.status} state`);
    }
    this.status = MilestoneStatus.COMPLETED;
  }

  /**
   * Create an act for this milestone
   * @returns The newly created Act
   */
  createAct(): Act {
    if (this.act) {
      throw new Error('Act already exists for this milestone');
    }
    
    this.act = new Act(this.id);
    return this.act;
  }

  /**
   * Mark milestone as paid
   */
  markAsPaid(): void {
    if (this.status !== MilestoneStatus.COMPLETED) {
      throw new Error('Cannot mark as paid: milestone not completed');
    }
    
    if (!this.act?.isComplete()) {
      throw new Error('Cannot mark as paid: act not completed');
    }
    
    this.status = MilestoneStatus.PAID;
  }
} 