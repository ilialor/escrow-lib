import { IDocumentService } from '../interfaces/services';
import { IDocument, IAct, IMilestone } from '../interfaces/base';
import { Document } from '../models/document';
import { DocumentType, ActStatus, DEFAULT_ACT_SIGNING_DEADLINE_DAYS, MIN_SIGNATURES_REQUIRED } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { IDoDComplianceResult } from '../interfaces/services';

/**
 * Service for managing order documents
 */
export class DocumentService implements IDocumentService {
  private documents: Map<string, IDocument>;
  private acts: Map<string, IAct>;
  private orderService: any; // Will be set via setOrderService method
  private userService: any; // Will be set via setUserService method
  private aiService: any; // Will be set via setAIService method
  
  constructor() {
    this.documents = new Map<string, IDocument>();
    this.acts = new Map<string, IAct>();
  }
  
  /**
   * Set service instances for cross-service communication
   * @param orderService OrderService instance
   * @param userService UserService instance
   * @param aiService AIService instance
   */
  setServices(orderService: any, userService: any, aiService?: any): void {
    this.orderService = orderService;
    this.userService = userService;
    if (aiService) {
      this.aiService = aiService;
    }
  }
  
  /**
   * Create a new document
   * @param orderId Order ID
   * @param documentType Type of document
   * @param content Document content
   * @param createdBy User ID of creator
   * @returns Created document
   */
  // async createDocument(
  //   orderId: string,
  //   documentType: DocumentType,
  //   content: string,
  //   createdBy: string
  // ): Promise<IDocument> {
  //   // Verify order exists
  //   try {
  //     await this.orderService.getOrder(orderId);
  //   } catch (error) {
  //     throw new Error(`Order not found: ${orderId}`);
  //   }
    
  //   // Verify user exists
  //   try {
  //     await this.userService.getUser(createdBy);
  //   } catch (error) {
  //     throw new Error(`User not found: ${createdBy}`);
  //   }
    
  //   const document = new Document(orderId, documentType, content, createdBy);
  //   this.documents.set(document.id, document);
  //   return document;
  // }
  
  /**
   * Create a document with object content and optional name and files
   * @param userId User ID creating the document
   * @param orderId Order ID
   * @param type Document type
   * @param name Document name
   * @param content Document content (object)
   * @param files Optional array of file paths/URLs
   * @returns Created document
   */
  async createDocument(
    userId: string, 
    orderId: string, 
    type: DocumentType,
    name: string, 
    content: any,
    files?: string[]
  ): Promise<IDocument> {
    // Verify order exists
    try {
      await this.orderService.getOrder(orderId);
    } catch (error) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    // Verify user exists
    try {
      await this.userService.getUser(userId);
    } catch (error) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Cast string type to DocumentType enum
    const documentType = type as DocumentType;
    if (!Object.values(DocumentType).includes(documentType)) {
        throw new Error(`Invalid document type: ${type}`);
    }

    const document = new Document(orderId, documentType, content, userId, undefined, name, files);
    this.documents.set(document.id, document);
    return document;
  }
  
  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document instance
   */
  async getDocument(documentId: string): Promise<IDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return document;
  }
  
  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document instance or null
   */
  async getDocumentById(documentId: string): Promise<IDocument | null> {
    return this.documents.get(documentId) || null;
  }
  
  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID approving the document
   * @returns true if document is now approved, false otherwise
   */
  async approveDocument(documentId: string, userId: string): Promise<boolean> {
    const document = await this.getDocument(documentId);
    
    // Verify user exists
    try {
      await this.userService.getUser(userId);
    } catch (error) {
      throw new Error(`User not found: ${userId}`);
    }
    
    document.approve(userId);
    return document.isApproved();
  }
  
  // /**
  //  * Update document content
  //  * @param documentId Document ID
  //  * @param content New content
  //  * @param userId User ID making the update
  //  * @returns Updated document
  //  */
  // async updateDocument(
  //   documentId: string,
  //   content: string,
  //   userId: string
  // ): Promise<IDocument> {
  //   const document = await this.getDocument(documentId);
    
  //   // Verify user exists
  //   try {
  //     await this.userService.getUser(userId);
  //   } catch (error) {
  //     throw new Error(`User not found: ${userId}`);
  //   }
    
  //   document.updateContent(content, userId);
  //   return document;
  // }
  
  /**
   * Update document with partial data
   * @param documentId Document ID
   * @param updates Partial document updates
   * @returns Updated document
   */
  async updateDocument(documentId: string, updates: Partial<IDocument>): Promise<IDocument> {
    const document = await this.getDocument(documentId);
    
    // Assuming updates might contain a userId for tracking who initiated the update
    const userId = (updates as any).userId || document.createdBy; 

    // Verify user exists if provided in updates
    if ((updates as any).userId) {
        try {
            await this.userService.getUser(userId);
        } catch (error) {
            throw new Error(`User specified in updates not found: ${userId}`);
        }
    }

    if (updates.content !== undefined) {
        // Pass userId to updateContent if the model supports it
        document.updateContent(updates.content, userId); 
    }
    
    if (updates.name !== undefined) {
        // Update name if it exists on the document model instance
        if ('name' in document) {
          (document as any).name = updates.name;
        } else {
           console.warn(`Attempted to update non-existent property 'name' on document ${documentId}`);
        }
    }
    
    if (updates.files !== undefined) {
         // Update files if it exists on the document model instance
        if ('files' in document) {
            (document as any).files = updates.files;
        } else {
           console.warn(`Attempted to update non-existent property 'files' on document ${documentId}`);
        }
    }

    // Update other partial fields if necessary and if they exist on IDocument/Document model
    // Example:
    // if (updates.version !== undefined) document.version = updates.version; 
    // Make sure to handle dateUpdated appropriately
    if ('dateUpdated' in document) {
        (document as any).dateUpdated = new Date();
    }
    
    return document;
  }
  
  /**
   * Get all documents for an order
   * @param orderId Order ID
   * @returns Map of document types to documents
   */
  async getDocumentsByOrder(orderId: string): Promise<Map<DocumentType, IDocument>> {
    const result = new Map<DocumentType, IDocument>();
    
    for (const document of this.documents.values()) {
      if (document.orderId === orderId) {
        result.set(document.documentType, document);
      }
    }
    
    return result;
  }
  
  /**
   * Get all documents for an order as array
   * @param orderId Order ID
   * @returns Array of documents
   */
  async getDocumentsByOrderId(orderId: string): Promise<IDocument[]> {
    const result: IDocument[] = [];
    
    for (const document of this.documents.values()) {
      if (document.orderId === orderId) {
        result.push(document);
      }
    }
    
    return result;
  }
  
  /**
   * Submit a deliverable for a phase of an order
   * @param userId User ID submitting the deliverable
   * @param orderId Order ID
   * @param phaseId Phase ID from the roadmap
   * @param name Deliverable name
   * @param content Deliverable content
   * @param files Optional files attached to the deliverable
   * @returns The created deliverable document
   */
  async submitDeliverable(
    userId: string, 
    orderId: string, 
    phaseId: string, 
    name: string, 
    content: any, 
    files?: string[]
  ): Promise<IDocument> {
    // Calls the createDocument implementation above
    return this.createDocument(userId, orderId, DocumentType.DELIVERABLE, name, {
        phaseId, 
        details: content 
      }, 
      files
    );
  }
  
  /**
   * Validate deliverables against DoD criteria (AI powered)
   * Matches the interface signature: (orderId: string, phaseId: string): Promise<IDoDComplianceResult>
   * @param orderId Order ID
   * @param phaseId Phase ID to validate
   * @returns Compliance result
   */
  async validateDeliverables(orderId: string, phaseId: string): Promise<IDoDComplianceResult> {
    if (!this.aiService) {
      throw new Error('AI Service not configured');
    }
    
    const order = await this.orderService.getOrder(orderId);
    const documents = await this.getDocumentsByOrderId(orderId);
    
    // Find the DoD document
    const dodDocument = documents.find(doc => doc.documentType === DocumentType.DEFINITION_OF_DONE);
    if (!dodDocument) {
      throw new Error(`Definition of Done document not found for order ${orderId}`);
    }
    
    // Filter deliverables relevant to the phaseId
    const phaseDeliverables = documents.filter(doc => 
        doc.documentType === DocumentType.DELIVERABLE &&
        (doc.content?.phaseId === phaseId) // Check phaseId within content
    );

    if (phaseDeliverables.length === 0) {
        return {
            compliant: false,
            details: [],
            overallScore: 0,
            recommendations: ["No deliverables found for this phase."]
        };
    }

    // Filter DoD criteria relevant to the phaseId
    const phaseCriteria = (dodDocument.content?.criteria || []).filter((c: any) => c.phaseId === phaseId);
    
    if (phaseCriteria.length === 0) {
         return {
            compliant: false,
            details: [],
            overallScore: 0,
            recommendations: [`No DoD criteria found for phase ${phaseId}.`]
        };
    }

    const phaseDoD = { ...dodDocument, content: { criteria: phaseCriteria } };
    
    // Call AI service to check compliance
    // Assuming aiService.checkDoD exists and matches expected signature
    return this.aiService.checkDoD(phaseDeliverables, phaseDoD as any); 
  }
  
  /**
   * Generate an Act of Work document for a milestone
   * Matches interface: (orderId: string, milestoneId: string, deliverableIds: string[]): Promise<IAct>
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds IDs of deliverables included in this act
   * @returns Created Act document
   */
  async generateAct(orderId: string, milestoneId: string, deliverableIds: string[]): Promise<IAct> {
    const order = await this.orderService.getOrder(orderId);
    // Add explicit type for m
    const milestone = order.getMilestones().find((m: IMilestone) => m.id === milestoneId);
    
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }
    
    // Check if deliverables exist (optional, depending on requirements)
    for (const deliverableId of deliverableIds) {
        if (!this.documents.has(deliverableId)) {
            console.warn(`Deliverable ID ${deliverableId} not found during Act generation.`);
            // Decide whether to throw an error or just warn
        }
    }

    // Create the act object adhering to IAct interface from base.ts
    const act: IAct = {
      id: uuidv4(),
      orderId: orderId, // Added orderId
      milestoneId: milestoneId,
      signatures: new Set<string>(), // Initialize as Set<string>
      dateCreated: new Date(),
      // dateSigned is set upon first signature
      status: ActStatus.CREATED, // Set initial status
      // Calculate deadline based on creation date
      deadline: new Date(Date.now() + DEFAULT_ACT_SIGNING_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
      relatedDeliverables: deliverableIds, // Store deliverable IDs
      
      // Implement required methods from IAct
      addSignature: (userId: string): boolean => {
        const currentAct = this.acts.get(act.id);
        if (currentAct && !currentAct.signatures.has(userId)) {
            currentAct.signatures.add(userId);
            if (currentAct.signatures.size === 1) {
                 (currentAct as any).dateSigned = new Date(); 
            }
            // Update status based on signatures (Example logic)
            const contractorSigned = currentAct.signatures.has(order.contractorId);
            const customerSigned = currentAct.signatures.has(order.creatorId); // Assuming creator is customer
            if(contractorSigned && customerSigned) {
                currentAct.status = ActStatus.COMPLETED;
            } else if (contractorSigned) {
                currentAct.status = ActStatus.SIGNED_CONTRACTOR;
            } else if (customerSigned) {
                currentAct.status = ActStatus.SIGNED_CUSTOMER;
            }
            // Handle platform signature if needed
            return true;
        } 
        return false;
      },
      isComplete: (): boolean => {
        const currentAct = this.acts.get(act.id);
        // Check status for completion
        return currentAct ? currentAct.status === ActStatus.COMPLETED : false;
        // Or check signatures: return currentAct ? currentAct.signatures.size >= MIN_SIGNATURES_REQUIRED : false;
      }
    };
    
    this.acts.set(act.id, act);
    return act;
  }
  
  /**
   * Sign an act
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns Updated act
   */
  async signAct(actId: string, userId: string): Promise<IAct> {
    const act = this.acts.get(actId);
    if (!act) {
      throw new Error(`Act not found: ${actId}`);
    }
    // Verify user exists
    try {
      await this.userService.getUser(userId);
    } catch (error) {
      throw new Error(`User not found: ${userId}`);
    }

    // Call the embedded addSignature method
    const added = act.addSignature(userId);
    if (!added) {
        console.warn(`User ${userId} already signed Act ${actId} or Act not found.`);
    }
    
    return act;
  }
  
  /**
   * Get an act by ID
   * @param actId Act ID
   * @returns Act or null if not found
   */
  async getActById(actId: string): Promise<IAct | null> {
    return this.acts.get(actId) || null;
  }
  
  /**
   * Get all acts for an order
   * @param orderId Order ID
   * @returns Array of acts
   */
  async getActsByOrderId(orderId: string): Promise<IAct[]> {
    const results: IAct[] = [];
    for (const act of this.acts.values()) {
      // Check if act has orderId property before comparing
      if (act.orderId === orderId) {
        results.push(act);
      }
    }
    return results;
  }
  
  /**
   * Automatically sign an act if the deadline passes
   * Matches interface: (actId: string, timeoutDays: number): Promise<void>
   * @param actId Act ID
   * @param timeoutDays Number of days for the timeout (overrides default)
   */
  async signActWithTimeout(actId: string, timeoutDays: number = DEFAULT_ACT_SIGNING_DEADLINE_DAYS): Promise<void> {
      const currentAct = this.acts.get(actId);
      if (!currentAct) {
        throw new Error(`Act not found: ${actId}`);
      }

      // Check if already completed or rejected
      if (currentAct.status === ActStatus.COMPLETED || currentAct.status === ActStatus.REJECTED) {
          console.log(`Act ${actId} is already in final state: ${currentAct.status}`);
          return;
      }

      // Calculate the effective deadline
      const deadline = new Date(currentAct.dateCreated.getTime() + timeoutDays * 24 * 60 * 60 * 1000);
      
      // Check if deadline has passed
      if (new Date() >= deadline) {
          console.log(`Signing deadline passed for Act ${actId}. Checking signatures...`);
          
          // Check if platform signature is required and missing (example)
          let platformSigned = false;
          for(const userId of currentAct.signatures) {
              // Need a way to check if userId belongs to platform
              // Example: const user = await this.userService.getUser(userId);
              // if (user.userType === UserType.PLATFORM) { platformSigned = true; break; }
              if (userId === 'PLATFORM_USER_ID') { // Placeholder check
                  platformSigned = true;
                  break;
              }
          }

          if (!platformSigned) {
              console.log(`Platform signature missing for Act ${actId}. Adding platform signature.`);
              // Add platform signature using the embedded method
              currentAct.addSignature('PLATFORM_USER_ID'); // Replace with actual platform user ID
          } else {
              console.log(`Platform already signed Act ${actId}.`);
          }

          // Check completion status again after potential platform signature
          if (currentAct.isComplete()) {
              console.log(`Act ${actId} is now complete.`);
          } else {
               console.warn(`Act ${actId} did not reach completion status after timeout.`);
               // Optional: Mark as rejected or handle otherwise
               // currentAct.status = ActStatus.REJECTED;
          }

      } else {
          console.log(`Signing deadline not yet passed for Act ${actId}.`);
      }
  }
} 