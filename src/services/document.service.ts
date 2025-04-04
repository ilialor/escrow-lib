import { v4 as uuidv4 } from 'uuid';
import {
    ActStatus,
    DocumentType,
    IAct,
    IDeliverableDocument,
    IDocument,
    IDocumentBase,
    IDoDDocument,
    IDoRDocument, IRoadmapDocument,
    ISpecificationDocument,
    IUser,
    MilestoneStatus,
    UserType
} from '../interfaces';
import { OrderService } from './order.service';

// keep base fields and merges specific fields, allowing content override.
type CreateDocumentInputData<T extends DocumentType> =
    // 1. Start with base fields OMITTING 'id', 'createdAt', 'type', potentially 'approvedBy'
    Omit<IDocumentBase, 'id' | 'createdAt' | 'type' | 'approvedBy'> &
    // 2. Add the specific 'type' being created
    { type: T } &
    // 3. Merge fields specific to the document type 'T'
    //    This uses Pick<...> to grab ONLY the fields unique to that type (including its specific 'content' type)
    //    It avoids omitting base fields like 'content' prematurely.
    (
        T extends DocumentType.ACT_OF_WORK ? Pick<IAct, 'milestoneId' | 'deliverableIds' | 'content'> :
        T extends DocumentType.DELIVERABLE ? Pick<IDeliverableDocument, 'phaseId' | 'content' | 'attachments'> & { attachments?: string[] } : // Optional attachments
        T extends DocumentType.DEFINITION_OF_READY ? Pick<IDoRDocument, 'content'> :
        T extends DocumentType.ROADMAP ? Pick<IRoadmapDocument, 'content'> :
        T extends DocumentType.DEFINITION_OF_DONE ? Pick<IDoDDocument, 'content'> :
        T extends DocumentType.SPECIFICATION ? Pick<ISpecificationDocument, 'content'> :
        // Fallback for any type not explicitly listed above, requires unknown content
        { content: unknown }
    );


export class DocumentService {
    private documents: Map<string, IDocument> = new Map();
    private orderService: OrderService;

    constructor(orderService: OrderService) {
        this.orderService = orderService;
    }

    // Updated internal method using the CORRECTED specific input type
    async _createDocumentInternal<T extends DocumentType>(docData: CreateDocumentInputData<T>): Promise<IDocument> {
         const baseProperties = {
             id: uuidv4(),
             createdAt: new Date(),
             orderId: docData.orderId,
             name: docData.name,
             createdBy: docData.createdBy,
         };

         let newDoc: IDocument;

         // Switch remains largely the same, but 'docData' now has the correctly typed 'content'
         switch(docData.type) {
             case DocumentType.ACT_OF_WORK:
                 const actData = docData as CreateDocumentInputData<DocumentType.ACT_OF_WORK>;
                 newDoc = {
                     ...baseProperties,
                     type: DocumentType.ACT_OF_WORK,
                     milestoneId: actData.milestoneId,
                     deliverableIds: actData.deliverableIds,
                     status: ActStatus.CREATED,
                     signedBy: [],
                     content: actData.content, // Accessing content is now valid
                 };
                 break;
             case DocumentType.DELIVERABLE:
                 const deliverableData = docData as CreateDocumentInputData<DocumentType.DELIVERABLE>;
                 newDoc = {
                      ...baseProperties,
                      type: DocumentType.DELIVERABLE,
                      phaseId: deliverableData.phaseId,
                      submittedAt: new Date(),
                      attachments: deliverableData.attachments || [],
                      content: deliverableData.content, // Accessing content is now valid
                 };
                 break;
             case DocumentType.DEFINITION_OF_READY:
                  const dorData = docData as CreateDocumentInputData<DocumentType.DEFINITION_OF_READY>;
                  newDoc = { ...baseProperties, type: DocumentType.DEFINITION_OF_READY, content: dorData.content };
                  break;
             case DocumentType.ROADMAP:
                  const roadmapData = docData as CreateDocumentInputData<DocumentType.ROADMAP>;
                  newDoc = { ...baseProperties, type: DocumentType.ROADMAP, content: roadmapData.content };
                  break;
            case DocumentType.DEFINITION_OF_DONE:
                  const dodData = docData as CreateDocumentInputData<DocumentType.DEFINITION_OF_DONE>;
                  newDoc = { ...baseProperties, type: DocumentType.DEFINITION_OF_DONE, content: dodData.content };
                  break;
             case DocumentType.SPECIFICATION:
                  const specData = docData as CreateDocumentInputData<DocumentType.SPECIFICATION>;
                  newDoc = { ...baseProperties, type: DocumentType.SPECIFICATION, content: specData.content };
                  break;
             default:
                  console.warn(`[DocumentService] Unhandled document type in _createDocumentInternal: ${docData.type}`);
                  newDoc = { ...baseProperties, type: docData.type, content: (docData as any).content };
                 break;
         }

         this.documents.set(newDoc.id, newDoc);
         console.log(`[DocumentService] Created document: "${newDoc.name}" (Type: ${newDoc.type}), ID: ${newDoc.id}`);
         return this.copyDocument(newDoc);
    }

    // --- Rest of the DocumentService remains unchanged ---
    async getDocument(id: string): Promise<IDocument | null> {
        const doc = this.documents.get(id);
        return doc ? this.copyDocument(doc) : null;
    }

    async findDocumentsByOrder(orderId: string, type?: DocumentType): Promise<IDocument[]> {
        const results: IDocument[] = [];
        this.documents.forEach(doc => {
            if (doc.orderId === orderId && (!type || doc.type === type)) {
                results.push(this.copyDocument(doc));
            }
        });
        return results;
    }

     async findDocumentsByOrderAndPhase(orderId: string, phaseId: string, type: DocumentType.DELIVERABLE): Promise<IDeliverableDocument[]> {
         const results: IDeliverableDocument[] = [];
         this.documents.forEach(doc => {
             if (doc.type === DocumentType.DELIVERABLE && doc.orderId === orderId && doc.phaseId === phaseId) {
                 results.push(this.copyDocument(doc) as IDeliverableDocument);
             }
         });
         return results;
     }

    async approveDocument(documentId: string, userId: string): Promise<IDocument | null> {
        const doc = this.documents.get(documentId);
        if (!doc) return null;

        if (doc.type === DocumentType.ACT_OF_WORK) {
            console.warn(`[DocumentService] Cannot 'approve' an Act document (${documentId}). Use 'signAct' instead.`);
            return this.copyDocument(doc);
        }

        if (!doc.approvedBy) {
            doc.approvedBy = [];
        }
        if (!doc.approvedBy.includes(userId)) {
            doc.approvedBy.push(userId);
            console.log(`[DocumentService] Document ${documentId} approved by user ${userId}`);
        }
        return this.copyDocument(doc);
    }

    async signAct(actId: string, userId: string, user: IUser): Promise<IAct | null> {
        const doc = this.documents.get(actId);
        if (!doc || doc.type !== DocumentType.ACT_OF_WORK) return null;
        let act = doc as IAct;

        const order = await this.orderService.getOrder(act.orderId);
        if (!order) {
             throw new Error(`Order ${act.orderId} not found when signing Act ${actId}.`);
        }

        let isAllowedToSign = false;
        if (user.id === order.contractorId) {
            isAllowedToSign = true; // Contractor can always sign
        } else if (order.isGroupOrder) {
            // Group Order: Only the representative can sign for the customer side
            if (order.representativeId && user.id === order.representativeId) {
                isAllowedToSign = true;
            } else {
                 console.warn(`[DocumentService] User ${userId} is not the representative (${order.representativeId}) for group order ${order.id} and cannot sign Act ${actId}.`);
            }
        } else {
            // Standard Order: Any of the (single) customer IDs can sign
            if (order.customerIds.includes(user.id)) {
                isAllowedToSign = true;
            }
        }

        if (!isAllowedToSign) {
             throw new Error(`User ${userId} (Type: ${user.type}) does not have permission to sign Act ${actId} for order ${order.id}.`);
        }

        if (act.status === ActStatus.REJECTED || act.status === ActStatus.COMPLETED) {
            console.warn(`[DocumentService] Cannot sign Act ${actId} in status ${act.status}.`);
            return this.copyDocument(act) as IAct;
        }
        if (act.signedBy.some(s => s.userId === userId)) {
             console.warn(`[DocumentService] Act ${actId} already signed by user ${userId}.`);
             return this.copyDocument(act) as IAct;
        }

        act.signedBy.push({ userId, signedAt: new Date() });

        // Determine who has signed based on the rules
        const contractorSigned = act.signedBy.some(s => s.userId === order.contractorId);
        let customerSideSigned = false;
        if (order.isGroupOrder) {
            customerSideSigned = act.signedBy.some(s => s.userId === order.representativeId);
        } else {
            // Check if any of the customer IDs (should be only one for standard) signed
            customerSideSigned = act.signedBy.some(s => order.customerIds.includes(s.userId));
        }

        let newStatus: ActStatus = act.status;

        if (contractorSigned && customerSideSigned) { // Both sides signed
            newStatus = ActStatus.COMPLETED;
            if (act.autoSignTimeoutHandle) {
                 clearTimeout(act.autoSignTimeoutHandle);
                 act.autoSignTimeoutHandle = undefined;
                 console.log(`[DocumentService] Cleared auto-sign timeout for completed Act ${actId}.`);
             }
            await this.orderService.updateMilestoneStatus(act.orderId, act.milestoneId, MilestoneStatus.COMPLETED);

        } else if (contractorSigned) {
            newStatus = ActStatus.SIGNED_CONTRACTOR;
            await this.orderService.updateMilestoneStatus(act.orderId, act.milestoneId, MilestoneStatus.AWAITING_ACCEPTANCE);
        } else if (customerSideSigned) {
            newStatus = ActStatus.SIGNED_CUSTOMER;
             await this.orderService.updateMilestoneStatus(act.orderId, act.milestoneId, MilestoneStatus.AWAITING_ACCEPTANCE);
        }

        if (newStatus !== act.status) {
             act.status = newStatus;
             console.log(`[DocumentService] Act ${actId} signed by user ${userId} (${user.type}). New status: ${act.status}`);
        }

        return this.copyDocument(act) as IAct;
    }

     async rejectAct(actId: string, userId: string, user: IUser, reason: string): Promise<IAct | null> {
         const doc = this.documents.get(actId);
         if (!doc || doc.type !== DocumentType.ACT_OF_WORK) return null;
         let act = doc as IAct;

         if (act.status === ActStatus.COMPLETED || act.status === ActStatus.REJECTED) {
             console.warn(`[DocumentService] Cannot reject Act ${actId} in status ${act.status}.`);
             return this.copyDocument(act) as IAct;
         }

         const order = await this.orderService.getOrder(act.orderId);
         if (!order) throw new Error(`Order ${act.orderId} not found.`);

         let canReject = false;
          if (order.isGroupOrder) {
              // Group Order: Only the representative can reject
              if (order.representativeId && user.id === order.representativeId) {
                  canReject = true;
              } else if (user.type === UserType.PLATFORM) {
                   canReject = true; // Platform can always reject
              }
          } else {
              // Standard Order: The customer or platform can reject
              if (order.customerIds.includes(user.id) || user.type === UserType.PLATFORM) {
                  canReject = true;
              }
          }

         if (!canReject) {
              throw new Error(`User ${userId} (${user.type}) does not have permission to reject Act ${actId} for order ${order.id}. Representative: ${order.representativeId}`);
         }

         const oldStatus = act.status;
         act.status = ActStatus.REJECTED;
         act.rejectionReason = reason || 'No reason provided.';

         if (act.autoSignTimeoutHandle) {
             clearTimeout(act.autoSignTimeoutHandle);
             act.autoSignTimeoutHandle = undefined;
             console.log(`[DocumentService] Cleared auto-sign timeout for rejected Act ${actId}.`);
         }

         await this.orderService.updateMilestoneStatus(act.orderId, act.milestoneId, MilestoneStatus.REJECTED);

         console.log(`[DocumentService] Act ${actId} rejected by user ${userId}. Reason: ${act.rejectionReason}`);
         return this.copyDocument(act) as IAct;
     }

    private copyDocument<T extends IDocument>(doc: T): T {
        const copy: T = { ...doc };
        if (copy.approvedBy) copy.approvedBy = [...copy.approvedBy];

        if (copy.type === DocumentType.ACT_OF_WORK) {
            const actCopy = copy as IAct;
            actCopy.signedBy = actCopy.signedBy.map(s => ({...s}));
            delete (actCopy as any).autoSignTimeoutHandle;
        }
        if (copy.type === DocumentType.DELIVERABLE) {
             const delivCopy = copy as IDeliverableDocument;
             if (delivCopy.attachments) delivCopy.attachments = [...delivCopy.attachments];
             if (delivCopy.content && typeof delivCopy.content === 'object') {
                  delivCopy.content = { ...delivCopy.content };
             }
        }
         if (copy.type === DocumentType.ROADMAP) {
             const roadmapCopy = copy as IRoadmapDocument;
             if (roadmapCopy.content?.phases) {
                roadmapCopy.content = {
                     ...roadmapCopy.content,
                     phases: roadmapCopy.content.phases.map(p => ({
                        ...p,
                        deliverables: [...p.deliverables],
                        dependsOn: p.dependsOn ? [...p.dependsOn] : undefined
                     }))
                };
             }
         }
          if (copy.type === DocumentType.DEFINITION_OF_READY) {
               const dorCopy = copy as IDoRDocument;
               if (dorCopy.content && typeof dorCopy.content === 'object') {
                    dorCopy.content = {
                         ...dorCopy.content,
                         resources: [...dorCopy.content.resources],
                         recommendations: [...dorCopy.content.recommendations],
                         risks: [...dorCopy.content.risks],
                    };
               }
          }
          if (copy.type === DocumentType.DEFINITION_OF_DONE) {
              const dodCopy = copy as IDoDDocument;
              if (dodCopy.content?.criteria) {
                  dodCopy.content = {
                       ...dodCopy.content,
                       criteria: dodCopy.content.criteria.map(c => ({...c})),
                  };
              }
          }
           if (copy.type === DocumentType.SPECIFICATION) {
               const specCopy = copy as ISpecificationDocument;
               if (specCopy.content && typeof specCopy.content === 'object') {
                    specCopy.content = {
                         ...specCopy.content,
                         requirements: specCopy.content.requirements ? [...specCopy.content.requirements] : undefined,
                    };
               }
           }

        return copy;
    }
}
