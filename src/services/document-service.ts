import { IDocumentService } from '../interfaces/services';
import { IDocument, IAct } from '../interfaces/base';
import { Document } from '../models/document';
import { DocumentType, ActStatus, DEFAULT_ACT_SIGNING_DEADLINE_DAYS } from '../utils/constants';
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
  async createDocument(
    orderId: string,
    documentType: DocumentType,
    content: string,
    createdBy: string
  ): Promise<IDocument> {
    // Verify order exists
    try {
      await this.orderService.getOrder(orderId);
    } catch (error) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    // Verify user exists
    try {
      await this.userService.getUser(createdBy);
    } catch (error) {
      throw new Error(`User not found: ${createdBy}`);
    }
    
    const document = new Document(orderId, documentType, content, createdBy);
    this.documents.set(document.id, document);
    return document;
  }
  
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
    type: string, 
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
    
    const documentType = type as DocumentType;
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
  
  /**
   * Update document content
   * @param documentId Document ID
   * @param content New content
   * @param userId User ID making the update
   * @returns Updated document
   */
  async updateDocument(
    documentId: string,
    content: string,
    userId: string
  ): Promise<IDocument> {
    const document = await this.getDocument(documentId);
    
    // Verify user exists
    try {
      await this.userService.getUser(userId);
    } catch (error) {
      throw new Error(`User not found: ${userId}`);
    }
    
    document.updateContent(content, userId);
    return document;
  }
  
  /**
   * Update document with partial data
   * @param documentId Document ID
   * @param updates Partial document updates
   * @returns Updated document
   */
  async updateDocument(documentId: string, updates: Partial<IDocument>): Promise<IDocument> {
    const document = await this.getDocument(documentId);
    
    if (updates.content) {
      document.updateContent(updates.content, updates.createdBy || document.createdBy);
    }
    
    if (updates.name) {
      (document as any).name = updates.name;
    }
    
    if (updates.files) {
      (document as any).files = updates.files;
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
    // Create a document of type DELIVERABLE
    const deliverable = await this.createDocument(
      userId,
      orderId,
      DocumentType.DELIVERABLE,
      name,
      {
        phaseId,
        content,
        submittedBy: userId,
        submittedAt: new Date().toISOString()
      },
      files
    );
    
    return deliverable;
  }
  
  /**
   * Validate deliverables against DoD criteria
   * @param orderId Order ID
   * @param phaseId Phase ID to validate
   * @returns Validation result
   */
  async validateDeliverables(orderId: string, phaseId: string): Promise<IDoDComplianceResult> {
    if (!this.aiService) {
      throw new Error('AI Service not configured for document validation');
    }
    
    // Find the DoD document for this order
    let dodDocument: IDocument | null = null;
    for (const doc of this.documents.values()) {
      if (doc.orderId === orderId && doc.documentType === DocumentType.DEFINITION_OF_DONE) {
        dodDocument = doc;
        break;
      }
    }
    
    if (!dodDocument) {
      throw new Error('Definition of Done document not found for this order');
    }
    
    // Find all deliverables for this phase
    const deliverables: IDocument[] = [];
    for (const doc of this.documents.values()) {
      if (
        doc.orderId === orderId && 
        doc.documentType === DocumentType.DELIVERABLE &&
        typeof doc.content === 'object' &&
        doc.content.phaseId === phaseId
      ) {
        deliverables.push(doc);
      }
    }
    
    if (deliverables.length === 0) {
      throw new Error(`No deliverables found for phase ${phaseId}`);
    }
    
    // Validate using AI service
    return await this.aiService.checkDoD(deliverables, dodDocument);
  }
  
  /**
   * Generate an act for a milestone based on deliverables
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds IDs of deliverable documents to include
   * @returns The created act
   */
  async generateAct(orderId: string, milestoneId: string, deliverableIds: string[]): Promise<IAct> {
    // Get order and milestone
    const order = await this.orderService.getOrder(orderId);
    const milestone = order.getMilestones().find(m => m.id === milestoneId);
    
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }
    
    // Verify deliverables exist
    const deliverables: IDocument[] = [];
    for (const id of deliverableIds) {
      const doc = await this.getDocumentById(id);
      if (!doc) {
        throw new Error(`Deliverable not found: ${id}`);
      }
      deliverables.push(doc);
    }
    
    // Create act content - could use AI service to generate if available
    let actContent: any = {
      milestoneId,
      milestoneName: milestone.description,
      amount: milestone.amount.toString(),
      date: new Date().toISOString(),
      deliverables: deliverableIds
    };
    
    if (this.aiService) {
      try {
        // Try to use AI to generate a better act
        const generatedContent = await this.aiService.autoFillForm(
          order, 
          'act_of_work', 
          { milestone, deliverables }
        );
        actContent = generatedContent;
      } catch (error) {
        console.error('Failed to generate act using AI, using default template:', error);
      }
    }
    
    // Create the act document
    const act: IAct = {
      id: uuidv4(),
      orderId,
      documentType: DocumentType.ACT_OF_WORK,
      content: actContent,
      version: 1,
      createdBy: 'SYSTEM',
      dateCreated: new Date(),
      dateUpdated: new Date(),
      approvals: new Set<string>(['SYSTEM']),
      name: `Act of Work - ${milestone.description}`,
      status: ActStatus.CREATED,
      signatures: [],
      deadline: new Date(Date.now() + DEFAULT_ACT_SIGNING_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
      relatedDeliverables: deliverableIds,
      approve: (userId: string) => { this.acts.get(act.id)?.approvals.add(userId); },
      isApproved: () => false,
      updateContent: () => {}
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
    const act = await this.getActById(actId);
    if (!act) {
      throw new Error(`Act not found: ${actId}`);
    }
    
    // Get user to determine type
    const user = await this.userService.getUser(userId);
    
    // Add signature
    const signature = {
      userType: user.userType,
      userId: user.id,
      signedAt: new Date()
    };
    
    act.signatures.push(signature);
    
    // Update status based on who signed
    switch (user.userType) {
      case 'contractor':
        act.status = ActStatus.SIGNED_CONTRACTOR;
        break;
      case 'customer':
        act.status = ActStatus.SIGNED_CUSTOMER;
        break;
      case 'platform':
        act.status = ActStatus.SIGNED_PLATFORM;
        break;
    }
    
    // Check if act is now complete (2+ signatures)
    if (act.signatures.length >= 2) {
      act.status = ActStatus.COMPLETED;
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
    const result: IAct[] = [];
    
    for (const act of this.acts.values()) {
      if (act.orderId === orderId) {
        result.push(act);
      }
    }
    
    return result;
  }
  
  /**
   * Sign an act automatically after a timeout if not already signed
   * @param actId Act ID
   * @param timeoutDays Days to wait before auto-signing
   */
  async signActWithTimeout(actId: string, timeoutDays: number = DEFAULT_ACT_SIGNING_DEADLINE_DAYS): Promise<void> {
    const act = await this.getActById(actId);
    if (!act) {
      throw new Error(`Act not found: ${actId}`);
    }
    
    // Schedule signing after timeout
    setTimeout(async () => {
      const currentAct = await this.getActById(actId);
      if (!currentAct) return;
      
      // Only auto-sign if not already completed and deadline passed
      if (
        currentAct.status !== ActStatus.COMPLETED && 
        currentAct.status !== ActStatus.REJECTED &&
        new Date() >= currentAct.deadline
      ) {
        // Auto-sign on behalf of the platform if not already signed by platform
        const platformSigned = currentAct.signatures.some(s => s.userType === 'platform');
        
        if (!platformSigned) {
          await this.signAct(actId, 'PLATFORM');
        }
      }
    }, timeoutDays * 24 * 60 * 60 * 1000);
  }
} 