import { OrderService, IMilestoneInputData } from '../src/services/order.service';
import { IOrder, IUser, OrderStatus, UserType } from '../src/interfaces';
import { DocumentService } from '../src/services/document.service';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
// Mock DocumentService if needed, or provide a minimal mock
jest.mock('../src/services/document.service');

describe('OrderService', () => {
    let orderService: OrderService;
    let mockDocumentService: jest.Mocked<DocumentService>;
    let customerA: IUser;
    let customerB: IUser;
    let customerC: IUser;
    let milestones: IMilestoneInputData[];

    beforeEach(() => {
        // Re-initialize service for each test
        orderService = new OrderService();
        // Create a mocked instance if methods are called internally
        mockDocumentService = new DocumentService(orderService) as jest.Mocked<DocumentService>;
        orderService.setDocumentService(mockDocumentService); // Inject mock

        // Sample users
        customerA = { id: 'user-a', name: 'Alice', type: UserType.CUSTOMER, balance: 1000 };
        customerB = { id: 'user-b', name: 'Bob', type: UserType.CUSTOMER, balance: 1000 };
        customerC = { id: 'user-c', name: 'Charlie', type: UserType.CUSTOMER, balance: 1000 };
        // Sample milestones
        milestones = [
            { description: 'Task 1', amount: 300, deadline: new Date() },
            { description: 'Task 2', amount: 700, deadline: new Date() },
        ];
    });

    describe('createGroupOrder', () => {
        it('should create a group order successfully with default representative', async () => {
            const customerIds = [customerA.id, customerB.id];
            const order = await orderService.createGroupOrder(customerIds, 'Group Project', 'Desc', milestones);

            expect(order).toBeDefined();
            expect(order.id).toBeDefined();
            expect(order.title).toBe('Group Project');
            expect(order.customerIds).toEqual(customerIds);
            expect(order.isGroupOrder).toBe(true);
            expect(order.representativeId).toBe(customerA.id); // Default to first
            expect(order.status).toBe(OrderStatus.CREATED);
            expect(order.totalAmount).toBe(1000);
            expect(order.milestones).toHaveLength(2);
        });

        it('should create a group order with a specified initial representative', async () => {
            const customerIds = [customerA.id, customerB.id, customerC.id];
            const order = await orderService.createGroupOrder(customerIds, 'Group Project 2', 'Desc 2', milestones, customerB.id);

            expect(order.representativeId).toBe(customerB.id);
        });

        it('should throw error if less than two customers', async () => {
            await expect(orderService.createGroupOrder([customerA.id], 'Fail Group', 'Desc', milestones))
                .rejects.toThrow('Group orders require at least two customer IDs.');
        });

         it('should throw error if initial representative is not in the customer list', async () => {
            const customerIds = [customerA.id, customerB.id];
            await expect(orderService.createGroupOrder(customerIds, 'Fail Group Rep', 'Desc', milestones, 'user-d'))
                .rejects.toThrow('Initial representative ID user-d is not in the list of customer IDs.');
        });
    });

    describe('voteForRepresentative', () => {
        let groupOrder: IOrder;
        let customerIds: string[]; // Define here

        beforeEach(async () => {
            // Initialize customerIds here after customers are defined
            customerIds = [customerA.id, customerB.id, customerC.id]; // 3 customers
            // Create a group order before each voting test
            groupOrder = await orderService.createGroupOrder(customerIds, 'Voting Test Order', 'Desc', milestones, customerA.id);
        });

        it('should record a single vote', async () => {
            const { order } = await orderService.voteForRepresentative(groupOrder.id, customerB.id, customerC.id);
            expect(order.votes).toBeDefined();
            expect(order.votes?.[customerC.id]).toContain(customerB.id);
            expect(order.representativeId).toBe(customerA.id); // No change yet
        });

        it('should change representative when majority is reached (2 out of 3)', async () => {
             // B votes for C
             await orderService.voteForRepresentative(groupOrder.id, customerB.id, customerC.id);
             // A votes for C (reaching majority)
             const { order, voteResult } = await orderService.voteForRepresentative(groupOrder.id, customerA.id, customerC.id);

             expect(voteResult.changed).toBe(true);
             expect(voteResult.newRepresentativeId).toBe(customerC.id);
             expect(order.representativeId).toBe(customerC.id);
             expect(order.votes).toEqual({}); // Votes should be cleared
        });

         it('should replace previous vote when voter votes again', async () => {
            // B votes for C
            await orderService.voteForRepresentative(groupOrder.id, customerB.id, customerC.id);
            let intermediateOrder = await orderService.getOrder(groupOrder.id);
            expect(intermediateOrder?.votes?.[customerC.id]).toContain(customerB.id);

            // B changes vote to A
            const { order } = await orderService.voteForRepresentative(groupOrder.id, customerB.id, customerA.id);
            expect(order.votes?.[customerC.id]).not.toContain(customerB.id);
            expect(order.votes?.[customerA.id]).toContain(customerB.id);
            expect(order.representativeId).toBe(customerA.id); // No change in rep yet
        });

        it('should not change representative if majority not reached', async () => {
             // B votes for C (1 vote, majority is 2)
             const { order, voteResult } = await orderService.voteForRepresentative(groupOrder.id, customerB.id, customerC.id);
             expect(voteResult.changed).toBe(false);
             expect(order.representativeId).toBe(customerA.id);
        });

        it('should throw error if voting on a non-group order', async () => {
            const standardOrder = await orderService.createOrder(customerA.id, 'Std Order', 'Desc', milestones);
             await expect(orderService.voteForRepresentative(standardOrder.id, customerA.id, customerA.id))
                 .rejects.toThrow(`Order ${standardOrder.id} is not a group order.`);
        });

         it('should throw error if voter is not a customer', async () => {
             await expect(orderService.voteForRepresentative(groupOrder.id, 'user-d', customerA.id))
                 .rejects.toThrow('User user-d is not a customer in this group order.');
         });

         it('should throw error if candidate is not a customer', async () => {
             await expect(orderService.voteForRepresentative(groupOrder.id, customerA.id, 'user-d'))
                 .rejects.toThrow('Candidate user-d is not a customer in this group order.');
         });
    });

    // Add more tests for assignContractor permissions, fundOrder contributions etc.
});
