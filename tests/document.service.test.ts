import { DocumentService } from '../src/services/document.service';
import { OrderService } from '../src/services/order.service';
import { IOrder, IUser, DocumentType, ActStatus, IAct, IDocument, UserType, MilestoneStatus, OrderStatus } from '../src/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
// Mock OrderService
jest.mock('../src/services/order.service');

describe('DocumentService', () => {
    let documentService: DocumentService;
    let mockOrderService: jest.Mocked<OrderService>;
    let mockStandardOrder: IOrder;
    let mockGroupOrder: IOrder;
    let customerA: IUser;
    let customerB: IUser;
    let representative: IUser;
    let contractor: IUser;
    let actForStandard: IAct;
    let actForGroup: IAct;
    let genericDoc: IDocument;

    beforeEach(async () => {
        mockOrderService = new OrderService() as jest.Mocked<OrderService>;
        documentService = new DocumentService(mockOrderService);

        // Setup mock users
        customerA = { id: 'cust-a', name: 'Cust A', type: UserType.CUSTOMER, balance: 0 };
        customerB = { id: 'cust-b', name: 'Cust B', type: UserType.CUSTOMER, balance: 0 };
        representative = { id: 'rep-a', name: 'Rep A', type: UserType.CUSTOMER, balance: 0 };
        contractor = { id: 'cont-a', name: 'Contractor A', type: UserType.CONTRACTOR, balance: 0 };

        // Setup mock orders
        mockStandardOrder = {
            id: 'order-std', customerIds: [customerA.id], isGroupOrder: false, title: 'Std', description: '', milestones: [{id: 'm1', orderId: 'order-std', description:'m1', amount:100, deadline: new Date(), status: MilestoneStatus.AWAITING_ACCEPTANCE, paid:false}], status: OrderStatus.IN_PROGRESS, totalAmount: 100, fundedAmount: 100, createdAt: new Date(), contractorId: contractor.id
        };
        mockGroupOrder = {
            id: 'order-grp', customerIds: [representative.id, customerB.id], isGroupOrder: true, representativeId: representative.id, title: 'Grp', description: '', milestones: [{id: 'm2', orderId: 'order-grp', description:'m2', amount:100, deadline: new Date(), status: MilestoneStatus.AWAITING_ACCEPTANCE, paid:false}], status: OrderStatus.IN_PROGRESS, totalAmount: 100, fundedAmount: 100, createdAt: new Date(), contractorId: contractor.id
        };

        // Mock getOrder implementation
        mockOrderService.getOrder.mockImplementation(async (orderId: string) => {
            if (orderId === mockStandardOrder.id) return mockStandardOrder;
            if (orderId === mockGroupOrder.id) return mockGroupOrder;
            return null;
        });
        mockOrderService.updateMilestoneStatus.mockResolvedValue(null); // Mock ok status update

        // Create some documents internally for testing sign/approve
        actForStandard = await documentService._createDocumentInternal({ orderId: mockStandardOrder.id, type: DocumentType.ACT_OF_WORK, milestoneId: 'm1', deliverableIds: ['d1'], name: 'Act Std', content: {}, createdBy: contractor.id }) as IAct;
        actForGroup = await documentService._createDocumentInternal({ orderId: mockGroupOrder.id, type: DocumentType.ACT_OF_WORK, milestoneId: 'm2', deliverableIds: ['d2'], name: 'Act Grp', content: {}, createdBy: contractor.id }) as IAct;
        genericDoc = await documentService._createDocumentInternal({ orderId: mockGroupOrder.id, type: DocumentType.SPECIFICATION, name: 'Spec Grp', content: {}, createdBy: representative.id });
    });

    describe('signAct', () => {
        it('should allow contractor to sign any act', async () => {
            const signedAct = await documentService.signAct(actForGroup.id, contractor.id, contractor);
            expect(signedAct?.signedBy).toEqual(expect.arrayContaining([expect.objectContaining({ userId: contractor.id })]));
            expect(signedAct?.status).toBe(ActStatus.SIGNED_CONTRACTOR);
        });

        it('should allow the customer to sign a standard order act', async () => {
             await documentService.signAct(actForStandard.id, contractor.id, contractor); // Contractor signs first
             const signedAct = await documentService.signAct(actForStandard.id, customerA.id, customerA);
             expect(signedAct?.signedBy).toEqual(expect.arrayContaining([expect.objectContaining({ userId: customerA.id })]));
             expect(signedAct?.status).toBe(ActStatus.COMPLETED); // Both signed
        });

        it('should allow the representative to sign a group order act', async () => {
            await documentService.signAct(actForGroup.id, contractor.id, contractor); // Contractor signs first
            const signedAct = await documentService.signAct(actForGroup.id, representative.id, representative);
            expect(signedAct?.signedBy).toEqual(expect.arrayContaining([expect.objectContaining({ userId: representative.id })]));
            expect(signedAct?.status).toBe(ActStatus.COMPLETED);
        });

        it('should PREVENT a non-representative customer from signing a group order act', async () => {
             await documentService.signAct(actForGroup.id, contractor.id, contractor); // Contractor signs first
             await expect(documentService.signAct(actForGroup.id, customerB.id, customerB))
                 .rejects.toThrow(`User ${customerB.id} (Type: ${customerB.type}) does not have permission to sign Act ${actForGroup.id} for order ${mockGroupOrder.id}.`);
        });
    });

     describe('rejectAct', () => {
         // Add similar tests for rejectAct permissions based on representative/customer
     });

    describe('approveDocument', () => {
         it('should allow the representative to approve a document for a group order', async () => {
             const approvedDoc = await documentService.approveDocument(genericDoc.id, representative.id);
             expect(approvedDoc?.approvedBy).toContain(representative.id);
         });

         it('should PREVENT a non-representative customer from approving a document for a group order', async () => {
              await expect(documentService.approveDocument(genericDoc.id, customerB.id))
                  .rejects.toThrow(`User ${customerB.id} is not the representative and cannot approve document ${genericDoc.id} for group order ${mockGroupOrder.id}.`);
         });

         it('should allow any customer (in this simple setup) to approve for standard order', async () => {
              const stdSpec = await documentService._createDocumentInternal({ orderId: mockStandardOrder.id, type: DocumentType.SPECIFICATION, name: 'Spec Std', content: {}, createdBy: customerA.id });
              const approvedDoc = await documentService.approveDocument(stdSpec.id, customerA.id);
              expect(approvedDoc?.approvedBy).toContain(customerA.id);
              // In current setup, even contractor could approve std order doc, maybe tighten this later?
              const approvedByContractor = await documentService.approveDocument(stdSpec.id, contractor.id);
              expect(approvedByContractor?.approvedBy).toContain(contractor.id);
         });
    });
});
