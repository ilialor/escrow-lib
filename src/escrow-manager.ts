import { EventEmitter } from 'events';
import {
    ActStatus,
    DocumentType,
    IAct,
    IDeliverableDocument,
    IDocument,
    IDoDDocument,
    IDoRDocument,
    IOrder,
    IRoadmapDocument,
    ISpecificationDocument,
    // Interfaces
    IUser,
    IValidationResult,
    MilestoneStatus,
    OrderStatus,
    // Enums from interfaces
    UserType
} from './interfaces'; // Import interfaces and their enums
import { AIService } from './services/ai.service';
import { DocumentService } from './services/document.service';
import { IMilestoneInputData, OrderService } from './services/order.service';
import { UserService } from './services/user.service';
// Import EscrowEvents specifically from constants
import { EscrowEvents } from './utils/constants';

export class EscrowManager extends EventEmitter {
    private userService: UserService;
    private orderService: OrderService;
    private documentService: DocumentService;
    private aiService: AIService;

    // Services are instantiated here. Consider Dependency Injection for larger apps.
    constructor(aiApiKey?: string) {
        super();
        this.setMaxListeners(20);

        this.userService = new UserService();
        // Corrected Initialization Order for Circular Dependency:
        // 1. Instantiate services (DocumentService needs OrderService ref later)
        this.orderService = new OrderService(); // Instantiate without docService first
        this.documentService = new DocumentService(this.orderService); // Pass orderService ref
        // 2. Inject the missing dependency back into OrderService
        this.orderService.setDocumentService(this.documentService); // Add a setter method

        this.aiService = new AIService(aiApiKey);

        console.log("EscrowManager initialized.");
    }

    // --- AI Configuration ---
    setAiApiKey(apiKey: string): void {
        this.aiService.setApiKey(apiKey);
    }

    isAiEnabled(): boolean {
        return this.aiService.isEnabled();
    }

    // --- User Management ---
    async createUser(name: string, type: UserType): Promise<IUser> {
        const user = await this.userService.createUser(name, type);
        this.emit(EscrowEvents.USER_CREATED, user);
        return user;
    }

    async getUser(id: string): Promise<IUser | null> {
        return this.userService.getUser(id);
    }

    async depositToUser(userId: string, amount: number): Promise<IUser> {
         // In a real system, this would involve payment gateways, etc.
         return this.userService.deposit(userId, amount);
    }

    // --- Order Management ---
     async createOrder(
        customerId: string,
        title: string,
        description: string,
        milestoneData: IMilestoneInputData[]
    ): Promise<IOrder> {
        const customer = await this.userService.getUser(customerId);
        if (!customer || customer.type !== UserType.CUSTOMER) {
            throw new Error(`Invalid customer ID ${customerId} or user is not a Customer.`);
        }
        const order = await this.orderService.createOrder(customerId, title, description, milestoneData);
        this.emit(EscrowEvents.ORDER_CREATED, order);
        return order;
    }

     async getOrder(id: string): Promise<IOrder | null> {
        return this.orderService.getOrder(id);
    }

     async assignContractor(orderId: string, contractorId: string, assignerUserId: string): Promise<IOrder> {
         const contractor = await this.userService.getUser(contractorId);
         if (!contractor || contractor.type !== UserType.CONTRACTOR) {
             throw new Error(`Invalid contractor ID ${contractorId} or user is not a Contractor.`);
         }
         const assigner = await this.userService.getUser(assignerUserId);
          if (!assigner) {
              throw new Error(`Assigner user with ID ${assignerUserId} not found.`);
          }

         const order = await this.orderService.assignContractor(orderId, contractorId, assigner);
         this.emit(EscrowEvents.ORDER_CONTRACTOR_ASSIGNED, { orderId, contractorId });
          if (order.status === OrderStatus.IN_PROGRESS && order.contractorId === contractorId) { // Check if status actually changed
             this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, oldStatus: OrderStatus.FUNDED, newStatus: OrderStatus.IN_PROGRESS }); // Assume it came from FUNDED
         }
         return order;
     }

     async fundOrder(orderId: string, fundingUserId: string, amount: number): Promise<IOrder> {
          const user = await this.userService.getUser(fundingUserId);
          if (!user) throw new Error(`Funding user ${fundingUserId} not found.`);
          // Basic check: only customer or platform can fund? Or anyone? Assume customer/platform.
          if (user.type !== UserType.CUSTOMER && user.type !== UserType.PLATFORM) {
              throw new Error(`User ${fundingUserId} type (${user.type}) cannot fund orders.`);
          }

          // Simulate withdrawing from user and adding to order escrow
          // In real app: integrate with payment/balance system
          await this.userService.withdraw(fundingUserId, amount); // Throws if insufficient balance
          try {
              const { order, newFundedAmount } = await this.orderService.fundOrder(orderId, amount);
              this.emit(EscrowEvents.ORDER_FUNDED, { orderId, amount, newFundedAmount });
              // Check if status changed due to funding
              if ((order.status === OrderStatus.FUNDED || order.status === OrderStatus.IN_PROGRESS) && newFundedAmount >= order.totalAmount) {
                  const oldStatus = order.contractorId ? OrderStatus.CREATED : OrderStatus.CREATED; // Infer old status (bit tricky)
                  this.emit(EscrowEvents.ORDER_STATUS_CHANGED, { orderId, oldStatus, newStatus: order.status });
              }
              return order;
          } catch(error) {
              // If order funding fails, attempt to refund the user
              await this.userService.deposit(fundingUserId, amount);
              throw error; // Re-throw the original error
          }
      }


    // --- Document Management (Manual Creation) ---
     async createSpecification(
        orderId: string,
        name: string,
        content: ISpecificationDocument['content'],
        createdByUserId: string
    ): Promise<ISpecificationDocument> {
        const user = await this.userService.getUser(createdByUserId);
        if (!user) throw new Error(`User ${createdByUserId} not found.`);
        const order = await this.orderService.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);

         const specData: Omit<ISpecificationDocument, 'id' | 'createdAt'> = {
             orderId,
             type: DocumentType.SPECIFICATION,
             name,
             content,
             createdBy: createdByUserId,
         };
         const doc = await this.documentService._createDocumentInternal(specData) as ISpecificationDocument;
         this.emit(EscrowEvents.DOCUMENT_CREATED, doc);
         return doc;
    }

    async getDocument(documentId: string): Promise<IDocument | null> {
        return this.documentService.getDocument(documentId);
    }

     async findDocumentsByOrder(orderId: string, type?: DocumentType): Promise<IDocument[]> {
         return this.documentService.findDocumentsByOrder(orderId, type);
     }

    async approveDocument(documentId: string, userId: string): Promise<IDocument | null> {
        const user = await this.userService.getUser(userId);
        if (!user) throw new Error(`User ${userId} not found.`);
        const doc = await this.documentService.approveDocument(documentId, userId);
        if (doc) {
            // Check if the approval actually happened (wasn't already approved by user)
             if (doc.approvedBy?.includes(userId)) {
                this.emit(EscrowEvents.DOCUMENT_APPROVED, { documentId, userId });
             }
        }
        return doc;
    }


    // --- AI Document Generation ---
    async generateDoR(orderId: string, requestedByUserId: string): Promise<IDoRDocument> {
        if (!this.isAiEnabled()) throw new Error("AI Service is not configured.");
        const order = await this.orderService.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);
        // Can anyone request? Let's assume yes for now.

        const dorData = await this.aiService.generateDoR(order, requestedByUserId);
        const dorDoc = await this.documentService._createDocumentInternal(dorData) as IDoRDocument;

        this.emit(EscrowEvents.DOR_GENERATED, dorDoc);
        this.emit(EscrowEvents.DOCUMENT_CREATED, dorDoc); // Also emit generic event
        return dorDoc;
    }

    async generateRoadmap(orderId: string, requestedByUserId: string): Promise<IRoadmapDocument> {
         if (!this.isAiEnabled()) throw new Error("AI Service is not configured.");
         const order = await this.orderService.getOrder(orderId);
         if (!order) throw new Error(`Order ${orderId} not found.`);

         const roadmapData = await this.aiService.generateRoadmap(order, requestedByUserId);
         const roadmapDoc = await this.documentService._createDocumentInternal(roadmapData) as IRoadmapDocument;

          // Potential enhancement: Update order milestones with roadmapPhaseId links here?
          // Needs careful handling if roadmap is regenerated.

         this.emit(EscrowEvents.ROADMAP_GENERATED, roadmapDoc);
         this.emit(EscrowEvents.DOCUMENT_CREATED, roadmapDoc);
         return roadmapDoc;
     }

     async generateDoD(orderId: string, requestedByUserId: string): Promise<IDoDDocument> {
         if (!this.isAiEnabled()) throw new Error("AI Service is not configured.");
         const order = await this.orderService.getOrder(orderId);
         if (!order) throw new Error(`Order ${orderId} not found.`);

         // Requires a Roadmap. Find the latest one for the order.
         const roadmaps = await this.documentService.findDocumentsByOrder(orderId, DocumentType.ROADMAP) as IRoadmapDocument[];
         if (roadmaps.length === 0) {
             throw new Error(`Cannot generate DoD for order ${orderId}: No Roadmap document found.`);
         }
         // Sort by creation date descending and take the first one
         roadmaps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
         const latestRoadmap = roadmaps[0];

         const dodData = await this.aiService.generateDoD(order, latestRoadmap, requestedByUserId);
         const dodDoc = await this.documentService._createDocumentInternal(dodData) as IDoDDocument;

         this.emit(EscrowEvents.DOD_GENERATED, dodDoc);
         this.emit(EscrowEvents.DOCUMENT_CREATED, dodDoc);
         return dodDoc;
     }

    // --- Deliverables ---
    async submitDeliverable(
        submitterUserId: string,
        orderId: string,
        phaseId: string, // Links deliverable to a roadmap phase
        name: string,
        content: IDeliverableDocument['content'],
        attachments?: string[]
    ): Promise<IDeliverableDocument> {
        const user = await this.userService.getUser(submitterUserId);
        if (!user) throw new Error(`Submitter user ${submitterUserId} not found.`);
        const order = await this.orderService.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);
        if (order.contractorId !== submitterUserId) {
            throw new Error(`User ${submitterUserId} is not the assigned contractor for order ${orderId}.`);
        }
        // Validation: Check if phaseId is valid (skipped for brevity).

        if (!content || !content.details) {
            throw new Error("Deliverable content must include 'details'.");
        }

        const deliverableData: Omit<IDeliverableDocument, 'id' | 'createdAt' | 'submittedAt'> = {
            orderId,
            type: DocumentType.DELIVERABLE,
            phaseId,
            name,
            content,
            attachments: attachments || [],
            createdBy: submitterUserId,
        };

        const doc = await this.documentService._createDocumentInternal(deliverableData) as IDeliverableDocument;
        this.emit(EscrowEvents.DELIVERABLE_SUBMITTED, doc);
        this.emit(EscrowEvents.DOCUMENT_CREATED, doc);

        // --- NEW: Update Milestone Status ---
        // Find the milestone linked to this phase (this linking isn't explicitly done yet,
        // so we'll find the milestone matching the phase's index as a simple heuristic)
        try {
            const roadmap = (await this.findDocumentsByOrder(orderId, DocumentType.ROADMAP) as IRoadmapDocument[])
                              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            if (roadmap) {
                const phaseIndex = roadmap.content.phases.findIndex(p => p.id === phaseId);
                if (phaseIndex !== -1 && order.milestones[phaseIndex]) {
                    const milestoneToUpdate = order.milestones[phaseIndex];
                    if (milestoneToUpdate.status === MilestoneStatus.PENDING || milestoneToUpdate.status === MilestoneStatus.IN_PROGRESS) {
                         // Change status to AWAITING_ACCEPTANCE upon first deliverable submission for the phase? Or IN_PROGRESS?
                         // Let's go with IN_PROGRESS if it was PENDING.
                         const targetStatus = MilestoneStatus.IN_PROGRESS; // Or AWAITING_ACCEPTANCE? Let's try IN_PROGRESS first.
                         if (milestoneToUpdate.status !== targetStatus) {
                            const oldStatus = milestoneToUpdate.status;
                            await this.orderService.updateMilestoneStatus(orderId, milestoneToUpdate.id, targetStatus);
                            this.emit(EscrowEvents.MILESTONE_STATUS_CHANGED, { orderId, milestoneId: milestoneToUpdate.id, oldStatus: oldStatus, newStatus: targetStatus });
                         }
                    }
                } else {
                     console.warn(`[EscrowManager] Could not find matching milestone for phase index ${phaseIndex} derived from phase ${phaseId}`);
                }
            } else {
                 console.warn(`[EscrowManager] Roadmap not found for order ${orderId} when trying to update milestone status.`);
            }
        } catch (e: any) {
            console.error(`[EscrowManager] Error trying to update milestone status after deliverable submission: ${e.message}`);
            // Continue even if status update fails for now
        }
        // --- End NEW ---

        return doc;
    }

     // --- AI Validation ---
    async validateDeliverables(orderId: string, phaseId: string): Promise<IValidationResult> {
        if (!this.isAiEnabled()) throw new Error("AI Service is not configured.");
        const order = await this.orderService.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);

        // Find relevant DoD document (latest one)
        const dods = await this.documentService.findDocumentsByOrder(orderId, DocumentType.DEFINITION_OF_DONE) as IDoDDocument[];
         if (dods.length === 0) {
             throw new Error(`Cannot validate phase ${phaseId} for order ${orderId}: No DoD document found.`);
         }
        dods.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const latestDod = dods[0];

        // Find submitted Deliverable documents for the phase
        const deliverables = await this.documentService.findDocumentsByOrderAndPhase(orderId, phaseId, DocumentType.DELIVERABLE);
        if (deliverables.length === 0) {
             console.warn(`No deliverables found for phase ${phaseId} in order ${orderId} to validate.`);
             // Return default non-compliant result if no deliverables submitted yet
             return { orderId, phaseId, deliverableIds: [], compliant: false, overallScore: 0, details: [], checkedAt: new Date() };
         }

        const validationResult = await this.aiService.validateDeliverables(order, phaseId, deliverables, latestDod);

        this.emit(EscrowEvents.DELIVERABLE_VALIDATED, validationResult);
        return validationResult;
    }

    // --- Act Management ---
     async generateAct(
        orderId: string,
        milestoneId: string,
        deliverableIds: string[], // IDs of deliverables being accepted
        generatorUserId: string // ID of the user generating the act (should be contractor)
    ): Promise<IAct> {
        const generator = await this.userService.getUser(generatorUserId);
        if (!generator) throw new Error(`Generator user ${generatorUserId} not found.`);
        const order = await this.orderService.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);
        // Validation: Only assigned contractor generates Acts
        if (order.contractorId !== generatorUserId) {
             throw new Error(`User ${generatorUserId} is not the assigned contractor and cannot generate an Act for order ${orderId}.`);
        }
        const milestone = order.milestones.find(m => m.id === milestoneId);
        if (!milestone) throw new Error(`Milestone ${milestoneId} not found in order ${orderId}.`);

         // --- ADJUSTED Check ---
         // Allow generating Act if status is IN_PROGRESS (work started) or AWAITING_ACCEPTANCE (already submitted)
         // Or maybe REJECTED (to generate a new act after fixing)? Let's allow IN_PROGRESS for now.
         if (milestone.status === MilestoneStatus.PENDING) { // Keep check for PENDING
            throw new Error(`Cannot generate Act for milestone ${milestoneId} in status PENDING. Requires work/deliverables first.`);
         }
          if (milestone.status === MilestoneStatus.COMPLETED) {
            // Optionally allow generating a new act even if completed? Or disallow? Disallow for now.
            throw new Error(`Cannot generate Act for milestone ${milestoneId} as it is already COMPLETED.`);
          } 

          const actName = `Act of Work - ${order.title} - Milestone: ${milestone.description}`;
          const actContent = {
              summary: `Acceptance of work for milestone '${milestone.description}' (ID: ${milestoneId}). Associated deliverables: ${deliverableIds.join(', ')}. Amount due: ${milestone.amount}.`,
              milestoneDetails: { ...milestone }
          };
          const actData: Omit<IAct, 'id' | 'createdAt' | 'status' | 'signedBy' | 'autoSignTimeoutHandle'> = {
              orderId, type: DocumentType.ACT_OF_WORK, milestoneId, deliverableIds, name: actName, content: actContent, createdBy: generatorUserId,
          };
          const actDoc = await this.documentService._createDocumentInternal(actData) as IAct;
  
          // Update milestone status to AWAITING_ACCEPTANCE after generating Act
          const oldMilestoneStatus = milestone.status; // Get status *before* potential change
          if (oldMilestoneStatus !== MilestoneStatus.AWAITING_ACCEPTANCE) {
              await this.orderService.updateMilestoneStatus(orderId, milestoneId, MilestoneStatus.AWAITING_ACCEPTANCE);
              this.emit(EscrowEvents.MILESTONE_STATUS_CHANGED, { orderId, milestoneId, oldStatus: oldMilestoneStatus, newStatus: MilestoneStatus.AWAITING_ACCEPTANCE}); // Emit status change
          }
  
          this.emit(EscrowEvents.ACT_CREATED, actDoc);
          this.emit(EscrowEvents.DOCUMENT_CREATED, actDoc);
          return actDoc;
      }

    async signActDocument(actId: string, userId: string): Promise<IAct> {
         const user = await this.userService.getUser(userId);
         if (!user) throw new Error(`User ${userId} not found.`);
         const act = await this.documentService.getDocument(actId);
         if (!act || act.type !== DocumentType.ACT_OF_WORK) {
             throw new Error(`Act document with ID ${actId} not found or is not an Act.`);
         }

         const updatedAct = await this.documentService.signAct(actId, userId, user);
         if (!updatedAct) {
             throw new Error(`Failed to sign Act ${actId}. Check status or if user already signed.`);
         }

         this.emit(EscrowEvents.ACT_SIGNED, { actId, userId, newStatus: updatedAct.status });

         if (updatedAct.status === ActStatus.COMPLETED) {
             this.emit(EscrowEvents.ACT_COMPLETED, { actId, milestoneId: updatedAct.milestoneId });
             // Trigger payment release process (simplified: mark milestone paid)
              await this.releaseMilestonePayment(updatedAct.orderId, updatedAct.milestoneId);
         }
         return updatedAct;
     }

      async rejectAct(actId: string, userId: string, reason: string): Promise<IAct> {
           const user = await this.userService.getUser(userId);
           if (!user) throw new Error(`User ${userId} not found.`);
           const act = await this.documentService.getDocument(actId);
           if (!act || act.type !== DocumentType.ACT_OF_WORK) {
               throw new Error(`Act document with ID ${actId} not found or is not an Act.`);
           }

           const rejectedAct = await this.documentService.rejectAct(actId, userId, user, reason);
            if (!rejectedAct) {
                throw new Error(`Failed to reject Act ${actId}. Check current status or permissions.`);
            }

           this.emit(EscrowEvents.ACT_REJECTED, { actId, userId, reason: rejectedAct.rejectionReason });
            this.emit(EscrowEvents.MILESTONE_STATUS_CHANGED, {
                orderId: rejectedAct.orderId,
                milestoneId: rejectedAct.milestoneId,
                oldStatus: MilestoneStatus.AWAITING_ACCEPTANCE, // Assume it was awaiting before rejection
                newStatus: MilestoneStatus.REJECTED
            });

           return rejectedAct;
       }


      // --- Auto Signing ---
      async setupActAutoSigning(actId: string, days: number): Promise<void> {
          if (days <= 0) throw new Error("Auto-sign period must be positive.");
          const doc = await this.documentService.getDocument(actId);
          if (!doc || doc.type !== DocumentType.ACT_OF_WORK) {
              throw new Error(`Act document with ID ${actId} not found.`);
          }
          let act = doc as IAct; // Get mutable reference from service if possible, or update after getting ID
          act = (this.documentService as any).documents.get(actId) as IAct; // Hacky way to get mutable ref

          if (!act) throw new Error(`Act ${actId} disappeared unexpectedly.`); // Safety check

          if (act.status === ActStatus.COMPLETED || act.status === ActStatus.REJECTED) {
               console.warn(`[EscrowManager] Act ${actId} is already ${act.status}. Cannot set up auto-signing.`);
               return;
          }

          const timeoutMs = days * 24 * 60 * 60 * 1000;
          // const timeoutMs = days * 1000; // For faster testing (seconds instead of days)
          console.log(`[EscrowManager] Setting up auto-sign for Act ${actId} in ${days} days (~${timeoutMs}ms).`);

          // Clear existing timeout if any
          if (act.autoSignTimeoutHandle) {
              clearTimeout(act.autoSignTimeoutHandle);
              console.log(`[EscrowManager] Cleared previous auto-sign timeout for Act ${actId}.`);
          }

          act.autoSignTimeoutHandle = setTimeout(async () => {
              try {
                  // Refetch the act to ensure it hasn't been completed/rejected manually
                  const currentAct = await this.documentService.getDocument(actId) as IAct | null;
                  if (!currentAct || currentAct.status === ActStatus.COMPLETED || currentAct.status === ActStatus.REJECTED) {
                      console.log(`[EscrowManager] Auto-sign for Act ${actId} aborted. Current status: ${currentAct?.status}.`);
                      return;
                  }

                  console.log(`[EscrowManager] Auto-signing Act ${actId} due to timeout...`);
                  const order = await this.getOrder(currentAct.orderId);
                  if (!order) {
                      console.error(`[EscrowManager] Auto-sign failed: Order ${currentAct.orderId} not found for Act ${actId}.`);
                      return;
                  }

                  const customerId = order.customerId;
                   // Check if customer already signed
                  const customerHasSigned = currentAct.signedBy.some(s => s.userId === customerId);

                  if (!customerHasSigned) {
                      console.log(`[EscrowManager] Attempting auto-sign for Act ${actId} as Customer (${customerId}).`);
                       await this.signActDocument(actId, customerId); // Attempt to sign as customer
                  } else {
                      console.log(`[EscrowManager] Auto-sign skipped for Act ${actId}: Customer already signed.`);
                  }
              } catch (error: any) {
                  console.error(`[EscrowManager] Error during auto-sign execution for Act ${actId}: ${error.message}`);
              } finally {
                  // Clear the handle reference in the persisted document AFTER execution attempt
                   const finalAct = (this.documentService as any).documents.get(actId) as IAct | null;
                   if (finalAct) {
                       finalAct.autoSignTimeoutHandle = undefined;
                   }
              }
          }, timeoutMs);
      }

// --- Payment / Fund Release (Simplified) ---
private async releaseMilestonePayment(orderId: string, milestoneId: string): Promise<void> {
    console.log(`[EscrowManager] Initiating payment release for Milestone ${milestoneId}, Order ${orderId}...`);
    const order = await this.orderService.getOrder(orderId);
    const milestone = order?.milestones.find(m => m.id === milestoneId);

    if (!order || !milestone) {
        console.error(`[EscrowManager] Payment release failed: Order or Milestone not found for ${orderId}/${milestoneId}.`);
        return;
    }
     if (milestone.paid) {
         console.warn(`[EscrowManager] Payment release skipped: Milestone ${milestoneId} already marked as paid.`);
         return;
     }
    if (!order.contractorId) {
         console.error(`[EscrowManager] Payment release failed: No contractor assigned to order ${orderId}.`);
         return;
    }

    const amountToRelease = milestone.amount;

    try {
        // In a real system: Interact with Escrow/Payment Provider API
        // Here: Simulate deposit to contractor's balance
        console.log(`[EscrowManager] Simulating transfer of ${amountToRelease} from escrow to Contractor ${order.contractorId}.`);
        await this.userService.deposit(order.contractorId, amountToRelease);

        // Mark milestone as paid in OrderService
        await this.orderService.markMilestonePaid(orderId, milestoneId);

        // Update order funded amount (optional, depends on how escrow is tracked)
        // order.fundedAmount -= amountToRelease; // If fundedAmount represents locked funds

        this.emit(EscrowEvents.MILESTONE_PAID, { orderId, milestoneId, amount: amountToRelease });
        console.log(`[EscrowManager] Payment released successfully for Milestone ${milestoneId}.`);

        // Check if the whole order is now complete
         const updatedOrder = await this.orderService.getOrder(orderId);
         if (updatedOrder?.status === OrderStatus.COMPLETED) {
              this.emit(EscrowEvents.ORDER_COMPLETED, { orderId });
         }

    } catch (error: any) {
        console.error(`[EscrowManager] Payment release FAILED for Milestone ${milestoneId}: ${error.message}`);
        // TODO: Implement retry logic or dispute handling?
    }
}

// --- Cleanup ---
 public cleanup(): void {
    console.log("[EscrowManager] Cleaning up active timeouts...");
    // Access the map directly (less ideal, but works for this structure)
    const docsMap = (this.documentService as any).documents as Map<string, IDocument>;
    docsMap.forEach(doc => {
         if (doc.type === DocumentType.ACT_OF_WORK) {
             const act = doc as IAct;
             if (act.autoSignTimeoutHandle) {
                 clearTimeout(act.autoSignTimeoutHandle);
                  console.log(`[EscrowManager] Cleared auto-sign timeout for Act ${act.id} during cleanup.`);
                  // Ideally, also nullify the handle in the stored object if possible
                  // act.autoSignTimeoutHandle = undefined; // This won't persist if using copies elsewhere
             }
         }
    });
     console.log("[EscrowManager] Cleanup complete.");
 }
}
