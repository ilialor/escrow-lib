# Group Orders

Escrow Library supports orders with multiple customers, known as Group Orders.

## Key Concepts

*   **Multiple Customers:** An order can be initiated by and associated with two or more customers (`customerIds` in `IOrder`).
*   **Representative:** Group orders have a designated `representativeId` (one of the `customerIds`). The representative acts on behalf of the customer group for certain actions.
*   **Shared Funding:** Customers contribute funds individually (`contributeFunds` method) until the `totalAmount` is reached.
*   **Voting:** Customers in a group order can vote to change the representative.

## Creating Group Orders

Use the `EscrowManager.createGroupOrder` method:

```typescript
const groupOrder = await escrowManager.createGroupOrder(
    [custA.id, custB.id, custC.id],
    'Project Title',
    'Project Description',
    milestoneData, // Array of milestone objects
    custA.id // Optional: Specify initial representative ID, defaults to the first customer in the list
);
```

## Representative Role

The designated representative (`representativeId`) is responsible for:

*   **Assigning Contractor:** Only the representative (or the platform) can assign a contractor using `assignContractor`.
*   **Signing Acts:** Only the representative can sign an `ACT_OF_WORK` document on behalf of the customer group using `signActDocument`.
*   **Rejecting Acts:** Only the representative (or the platform) can reject an `ACT_OF_WORK` document using `rejectAct`.
*   **Approving Documents (Optional):** While the current `approveDocument` logic allows any user, you might enforce representative-only approval for specific document types if needed by customizing the `DocumentService.approveDocument` method.

## Voting for Representative

Any customer within a group order can vote to change the representative.

**Process:**

1.  **Initiate Vote:** A customer calls `EscrowManager.voteForRepresentative(orderId, voterId, candidateId)`.
    *   `orderId`: The ID of the group order.
    *   `voterId`: The ID of the customer casting the vote.
    *   `candidateId`: The ID of the customer they are voting for (must also be in the `customerIds` list).
2.  **Vote Recording:** The vote is recorded internally within the `IOrder` object's `votes` property. A customer can only have one active vote; casting a new vote removes their previous one.
3.  **Majority Check:** After each vote, the system checks if the `candidateId` has received a majority of votes (more than half of the total number of customers in the group).
4.  **Representative Change:** If a candidate achieves a majority:
    *   Their ID becomes the new `representativeId` for the order.
    *   All existing votes (`order.votes`) are cleared.
    *   The `EscrowEvents.GROUP_ORDER_REPRESENTATIVE_CHANGED` event is emitted.

**Example:**

```typescript
// Customer B votes for Customer C
await escrowManager.voteForRepresentative(groupOrder.id, custB.id, custC.id);

// Customer A votes for Customer C
await escrowManager.voteForRepresentative(groupOrder.id, custA.id, custC.id);

// If custA and custB constitute a majority, custC is now the representative,
// and the GROUP_ORDER_REPRESENTATIVE_CHANGED event is emitted.
```
```
