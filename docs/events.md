# Group Order Events

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

**3. Обновление `docs/architecture.md`**

Кратко упомяну добавление `votes` и `voteForRepresentative`.

**4. Обновление `docs/events.md`**

Добавлю описание события `GROUP_ORDER_REPRESENTATIVE_CHANGED`.

Похоже, файла `docs/events.md` тоже нет. Пожалуйста, создайте его и добавьте следующее содержимое:

```markdown
# Events

The `EscrowManager` emits events for various state changes throughout the lifecycle of users, orders, documents, and milestones. You can subscribe to these events using the standard `EventEmitter` methods like `.on()`, `.once()`, etc.

## User Events

*   **`EscrowEvents.USER_CREATED`**
    *   Payload: `IUser` - The newly created user object.
    *   Emitted when `createUser` is successfully called.

*   **`EscrowEvents.USER_DEPOSIT`**
    *   Payload: `{ userId: string, amount: number }` - The ID of the user and the amount deposited.
    *   Emitted when `depositToUser` successfully increases a user's balance.

## Order Events

*   **`EscrowEvents.ORDER_CREATED`**
    *   Payload: `IOrder` - The newly created standard order object.
    *   Emitted when `createOrder` successfully creates a single-customer order.

*   **`EscrowEvents.GROUP_ORDER_CREATED`**
    *   Payload: `IOrder` - The newly created group order object.
    *   Emitted when `createGroupOrder` successfully creates a multi-customer order.

*   **`EscrowEvents.ORDER_FUNDS_CONTRIBUTED`**
    *   Payload: `{ orderId: string, customerId: string, amount: number, newFundedAmount: number }` - Details of the contribution.
    *   Emitted each time `contributeFunds` is successfully called for an order.

*   **`EscrowEvents.ORDER_FUNDED`**
    *   Payload: `IOrder` - The order object that just reached full funding.
    *   Emitted when a contribution makes `fundedAmount` reach or exceed `totalAmount`.

*   **`EscrowEvents.ORDER_CONTRACTOR_ASSIGNED`**
    *   Payload: `{ orderId: string, contractorId: string }` - The order and the assigned contractor.
    *   Emitted when `assignContractor` successfully assigns a contractor.

*   **`EscrowEvents.ORDER_STATUS_CHANGED`**
    *   Payload: `{ orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus }` - Details of the status change.
    *   Emitted when an order's status changes (e.g., `CREATED` -> `FUNDED`, `FUNDED` -> `IN_PROGRESS`, `IN_PROGRESS` -> `COMPLETED`).

*   **`EscrowEvents.ORDER_COMPLETED`**
    *   Payload: `{ orderId: string }` - The ID of the completed order.
    *   Emitted when all milestones of an order are completed and the order status changes to `COMPLETED`.

*   **`EscrowEvents.GROUP_ORDER_REPRESENTATIVE_CHANGED`**
    *   Payload: `{ orderId: string, oldRepresentativeId?: string, newRepresentativeId: string }` - Details about the representative change.
    *   Emitted when `voteForRepresentative` results in a successful change of the representative due to achieving a majority vote.

## Milestone Events

*   **`EscrowEvents.MILESTONE_STATUS_CHANGED`**
    *   Payload: `{ orderId: string, milestoneId: string, oldStatus: MilestoneStatus, newStatus: MilestoneStatus }` - Details of the milestone status change.
    *   Emitted when a milestone's status changes (e.g., `PENDING` -> `IN_PROGRESS`, `AWAITING_ACCEPTANCE` -> `COMPLETED`, `AWAITING_ACCEPTANCE` -> `REJECTED`).

*   **`EscrowEvents.MILESTONE_PAID`**
    *   Payload: `{ orderId: string, milestoneId: string, amount: number }` - Details of the milestone payment.
    *   Emitted when `releaseMilestonePayment` successfully simulates paying the contractor for a completed milestone.

## Document & Act Events

*   **`EscrowEvents.DOCUMENT_CREATED`**
    *   Payload: `IDocument` - The newly created document object (can be any document type, including Acts).
    *   Emitted whenever any document (DoR, Roadmap, DoD, Specification, Deliverable, Act) is created.

*   **`EscrowEvents.DOR_GENERATED`**, **`EscrowEvents.ROADMAP_GENERATED`**, **`EscrowEvents.DOD_GENERATED`**
    *   Payload: `IDoRDocument` | `IRoadmapDocument` | `IDoDDocument` - The specific AI-generated document.
    *   Emitted after successful AI generation *and* creation of the respective document. Note that `DOCUMENT_CREATED` is also emitted.

*   **`EscrowEvents.DOCUMENT_APPROVED`**
    *   Payload: `{ documentId: string, userId: string }` - The ID of the document and the approving user.
    *   Emitted when `approveDocument` successfully adds a user to the `approvedBy` list.

*   **`EscrowEvents.DELIVERABLE_SUBMITTED`**
    *   Payload: `IDeliverableDocument` - The submitted deliverable document.
    *   Emitted when `submitDeliverable` successfully creates a deliverable document.

*   **`EscrowEvents.DELIVERABLE_VALIDATED`**
    *   Payload: `IValidationResult` - The result object from AI validation.
    *   Emitted after `validateDeliverables` completes the AI validation process.

*   **`EscrowEvents.ACT_CREATED`**
    *   Payload: `IAct` - The newly generated Act of Work document.
    *   Emitted when `generateAct` successfully creates an Act. Note that `DOCUMENT_CREATED` is also emitted.

*   **`EscrowEvents.ACT_SIGNED`**
    *   Payload: `{ actId: string, userId: string, newStatus: ActStatus }` - Details of the signature and the resulting status.
    *   Emitted when `signActDocument` successfully records a signature.

*   **`EscrowEvents.ACT_REJECTED`**
    *   Payload: `{ actId: string, userId: string, reason?: string }` - Details of the rejection.
    *   Emitted when `rejectAct` successfully marks an Act as rejected.

*   **`EscrowEvents.ACT_COMPLETED`**
    *   Payload: `{ actId: string, milestoneId: string }` - IDs of the completed Act and its associated milestone.
    *   Emitted when `signActDocument` results in the Act reaching `COMPLETED` status (i.e., all required signatures obtained). This typically triggers the payment release process.

## Example Usage

```typescript
import { EscrowManager, EscrowEvents, IOrder } from 'escrow-lib'; // Or adjust path

const manager = new EscrowManager();

manager.on(EscrowEvents.ORDER_CREATED, (order: IOrder) => {
  console.log(`New order "${order.title}" was created!`);
});

manager.on(EscrowEvents.MILESTONE_PAID, (data) => {
  console.log(`Milestone ${data.milestoneId} paid ${data.amount}.`);
});

manager.on(EscrowEvents.GROUP_ORDER_REPRESENTATIVE_CHANGED, (data) => {
  console.log(`Representative for order ${data.orderId} changed to ${data.newRepresentativeId}`);
});

// ... add listeners for other events
```

