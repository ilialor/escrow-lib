import { EscrowManager } from './src/escrow-manager'; // Import class directly
import { // Import types/enums separately
    ActStatus,
    EscrowEvents,
    IAct,
    IDeliverableDocument,
    IDocument,
    IDoDDocument,
    IDoRDocument,
    IOrder,
    IRoadmapDocument,
    IUser,
    IValidationResult,
    MilestoneStatus,
    OrderStatus,
    UserType
} from './src'; // Keep using barrel file for types/enums
// Removed uuid import as it's not directly used here

// --- Main Application Logic ---
async function runDemo() {
    console.log("--- Initializing Escrow Manager ---");
    // Provide a mock API key to enable AI features
    const MOCK_API_KEY = 'mock-gemini-key-12345';
    const escrowManager = new EscrowManager(MOCK_API_KEY);

    // --- Setup Event Listeners ---
    console.log("\n--- Setting up Event Listeners ---");

    escrowManager.on(EscrowEvents.USER_CREATED, (user: IUser) => {
        console.log(`[EVENT ${EscrowEvents.USER_CREATED}] New user: ${user.name} (Type: ${user.type}, ID: ${user.id})`);
    });

    escrowManager.on(EscrowEvents.ORDER_CREATED, (order: IOrder) => {
        console.log(`[EVENT ${EscrowEvents.ORDER_CREATED}] New order: "${order.title}" (ID: ${order.id}, Status: ${order.status}, Total: ${order.totalAmount})`);
    });

    escrowManager.on(EscrowEvents.ORDER_FUNDED, (data: { orderId: string; amount: number; newFundedAmount: number }) => {
        console.log(`[EVENT ${EscrowEvents.ORDER_FUNDED}] Order ${data.orderId} funded with ${data.amount}. New funded amount: ${data.newFundedAmount}`);
    });

    escrowManager.on(EscrowEvents.ORDER_CONTRACTOR_ASSIGNED, (data: { orderId: string; contractorId: string }) => {
        console.log(`[EVENT ${EscrowEvents.ORDER_CONTRACTOR_ASSIGNED}] Contractor ${data.contractorId} assigned to Order ${data.orderId}`);
    });

     escrowManager.on(EscrowEvents.ORDER_STATUS_CHANGED, (data: { orderId: string; oldStatus: OrderStatus; newStatus: OrderStatus }) => {
         console.log(`[EVENT ${EscrowEvents.ORDER_STATUS_CHANGED}] Order ${data.orderId} status changed from ${data.oldStatus} to ${data.newStatus}`);
     });

      escrowManager.on(EscrowEvents.ORDER_COMPLETED, (data: { orderId: string }) => {
         console.log(`[EVENT ${EscrowEvents.ORDER_COMPLETED}] Order ${data.orderId} is fully completed!`);
     });


    escrowManager.on(EscrowEvents.DOCUMENT_CREATED, (doc: IDocument) => {
         console.log(`[EVENT ${EscrowEvents.DOCUMENT_CREATED}] New document created: "${doc.name}" (Type: ${doc.type}, ID: ${doc.id})`);
    });

    escrowManager.on(EscrowEvents.DOR_GENERATED, (dor: IDoRDocument) => {
        console.log(`[EVENT ${EscrowEvents.DOR_GENERATED}] DoR "${dor.name}" (ID: ${dor.id}) generated for Order ${dor.orderId}`);
    });

     escrowManager.on(EscrowEvents.ROADMAP_GENERATED, (roadmap: IRoadmapDocument) => {
        console.log(`[EVENT ${EscrowEvents.ROADMAP_GENERATED}] Roadmap "${roadmap.name}" (ID: ${roadmap.id}) generated for Order ${roadmap.orderId}`);
    });

     escrowManager.on(EscrowEvents.DOD_GENERATED, (dod: IDoDDocument) => {
        console.log(`[EVENT ${EscrowEvents.DOD_GENERATED}] DoD "${dod.name}" (ID: ${dod.id}) generated for Order ${dod.orderId}`);
    });

    escrowManager.on(EscrowEvents.DELIVERABLE_SUBMITTED, (deliverable: IDeliverableDocument) => {
        console.log(`[EVENT ${EscrowEvents.DELIVERABLE_SUBMITTED}] Deliverable "${deliverable.name}" (ID: ${deliverable.id}) submitted by User ${deliverable.createdBy} for Phase ${deliverable.phaseId}, Order ${deliverable.orderId}`);
    });

     escrowManager.on(EscrowEvents.DELIVERABLE_VALIDATED, (result: IValidationResult) => {
        console.log(`[EVENT ${EscrowEvents.DELIVERABLE_VALIDATED}] Deliverables validated for Phase ${result.phaseId}, Order ${result.orderId}. Compliant: ${result.compliant}, Score: ${result.overallScore}%`);
        // Optionally log details: console.log("Validation Details:", JSON.stringify(result.details, null, 2));
    });

    escrowManager.on(EscrowEvents.DOCUMENT_APPROVED, (data: { documentId: string; userId: string }) => {
       console.log(`[EVENT ${EscrowEvents.DOCUMENT_APPROVED}] Document ${data.documentId} approved by User ${data.userId}`);
    });


    escrowManager.on(EscrowEvents.MILESTONE_STATUS_CHANGED, (data: { orderId: string; milestoneId: string; oldStatus: MilestoneStatus; newStatus: MilestoneStatus }) => {
        console.log(`[EVENT ${EscrowEvents.MILESTONE_STATUS_CHANGED}] Milestone ${data.milestoneId} (Order ${data.orderId}) status changed from ${data.oldStatus} to ${data.newStatus}`);
    });

     escrowManager.on(EscrowEvents.MILESTONE_PAID, (data: { orderId: string; milestoneId: string; amount: number }) => {
         console.log(`[EVENT ${EscrowEvents.MILESTONE_PAID}] Milestone ${data.milestoneId} (Order ${data.orderId}) paid out ${data.amount} to contractor.`);
     });


    escrowManager.on(EscrowEvents.ACT_CREATED, (act: IAct) => {
        console.log(`[EVENT ${EscrowEvents.ACT_CREATED}] Act "${act.name}" (ID: ${act.id}, Status: ${act.status}) created for Order ${act.orderId}, Milestone ${act.milestoneId}`);
    });

    escrowManager.on(EscrowEvents.ACT_SIGNED, (data: { actId: string, userId: string, newStatus: ActStatus }) => {
        console.log(`[EVENT ${EscrowEvents.ACT_SIGNED}] Act ${data.actId} signed by User ${data.userId}. New status: ${data.newStatus}`);
    });

     escrowManager.on(EscrowEvents.ACT_REJECTED, (data: { actId: string; userId: string; reason?: string }) => {
         console.log(`[EVENT ${EscrowEvents.ACT_REJECTED}] Act ${data.actId} rejected by User ${data.userId}. Reason: ${data.reason}`);
     });

     escrowManager.on(EscrowEvents.ACT_COMPLETED, (data: { actId: string, milestoneId: string }) => {
        console.log(`[EVENT ${EscrowEvents.ACT_COMPLETED}] Act ${data.actId} (for Milestone ${data.milestoneId}) is now COMPLETED. Payment should be initiated.`);
    });


    try {
        // --- Create Users ---
        console.log("\n--- 1. Creating Users ---");
        const customer = await escrowManager.createUser('Alice Customer', UserType.CUSTOMER);
        const contractor = await escrowManager.createUser('Bob Contractor', UserType.CONTRACTOR);
        // const platform = await escrowManager.createUser('Platform Admin', UserType.PLATFORM); // If needed

        // --- Create Order ---
        console.log("\n--- 2. Creating Order ---");
        const orderInputMilestones = [
            { description: 'Phase 1: Design & Mockups', amount: '1000', deadline: new Date('2024-09-01') },
            { description: 'Phase 2: Frontend Development', amount: '2500', deadline: new Date('2024-10-15') },
            { description: 'Phase 3: Backend & Database', amount: '3000', deadline: new Date('2024-11-30') },
            { description: 'Phase 4: Testing & Deployment', amount: '1500', deadline: new Date('2024-12-15') }
        ];
        let order = await escrowManager.createOrder(
            customer.id,
            'E-commerce Website Development',
            'Build a full-featured e-commerce site with product catalog, cart, and checkout.',
            orderInputMilestones
        );
        const orderTotalAmount = order.totalAmount; // Get total amount from created order

        // --- Fund Order (Simulate) ---
        console.log("\n--- 3. Funding Order ---");
        console.log(`Depositing funds to customer ${customer.name}...`);
        await escrowManager.depositToUser(customer.id, orderTotalAmount + 500); // Deposit enough funds
        console.log(`Funding order ${order.id} fully...`);
        order = await escrowManager.contributeFunds(order.id, customer.id, orderTotalAmount);


        // --- Assign Contractor ---
        console.log("\n--- 4. Assigning Contractor ---");
        // Assuming customer assigns the contractor
        order = await escrowManager.assignContractor(order.id, contractor.id, customer.id);


        // --- AI Document Generation ---
        console.log("\n--- 5. Generating Documents with AI ---");
        // Requesting user ID needed for creator field in generated docs
        const dor: IDoRDocument = await escrowManager.generateDoR(order.id, customer.id);
        const roadmap: IRoadmapDocument = await escrowManager.generateRoadmap(order.id, customer.id);
        const dod: IDoDDocument = await escrowManager.generateDoD(order.id, customer.id);

        console.log(`Generated DoR Name: ${dor.name}, ID: ${dor.id}`);
        console.log(`Generated Roadmap Name: ${roadmap.name}, Phases: ${roadmap.content.phases.length}, ID: ${roadmap.id}`);
        console.log(`Generated DoD Name: ${dod.name}, Criteria: ${dod.content.criteria.length}, ID: ${dod.id}`);


        // --- Manual Document Creation & Approval ---
        console.log("\n--- 6. Manual Document Handling (Specification) ---");
         const specDoc = await escrowManager.createSpecification(
            order.id,
            'Initial Project Specification',
            { scope: 'Homepage, Product List, Product Detail pages', requirements: ['Responsive design', 'User login'], details: 'More details about the spec...' },
            customer.id // Created by customer
         );
         console.log(`Created Specification Doc ID: ${specDoc.id}, Name: ${specDoc.name}`);
         // Approve the specification (e.g., by Contractor)
         const approvedSpecDoc = await escrowManager.approveDocument(specDoc.id, contractor.id);
         if(approvedSpecDoc) console.log(`Specification Doc Approved By: ${approvedSpecDoc.approvedBy?.join(', ')}`);


        // --- Simulate Work: Submit Deliverable for Phase 1 ---
        console.log("\n--- 7. Submitting Deliverable for Phase 1 ---");
        const firstPhaseId = roadmap.content.phases[0]?.id;
        if (!firstPhaseId) {
            console.error("Could not find first phase ID in the generated roadmap.");
            return; // Stop if no phase ID
        }

        const deliverable1: IDeliverableDocument = await escrowManager.submitDeliverable(
            contractor.id, // Submitted by contractor
            order.id,
            firstPhaseId,
            'Design Mockups Package V1', // Name of the deliverable document
            { details: 'Complete set of Figma mockups for all main pages (Version 1).'},
            ['mockups_v1.fig', 'style_guide_v1.pdf'] // Example attachments
        );
        console.log(`Submitted Deliverable ID: ${deliverable1.id}, Name: ${deliverable1.name}, for Phase: ${firstPhaseId}`);


        // --- AI Validation for Phase 1---
        console.log("\n--- 8. Validating Deliverable with AI (Phase 1) ---");
        const validationResult1 = await escrowManager.validateDeliverables(order.id, firstPhaseId);
        console.log("Validation Result (Phase 1):", JSON.stringify(validationResult1, null, 2));
        if (!validationResult1.compliant) {
             console.warn("Phase 1 deliverables NOT compliant according to AI validation. Skipping Act generation for Phase 1 in this demo run.");
             // In a real app, contractor would need to fix and resubmit.
        } else {
            console.log("Phase 1 deliverables ARE compliant. Proceeding with Act generation.");

             // --- Act Generation and Signing for Phase 1 ---
             console.log("\n--- 9. Generating and Signing Act of Work (Phase 1) ---");
             // Assume the first milestone corresponds to the first phase
             const firstMilestoneId = order.milestones[0]?.id;
             if (!firstMilestoneId) {
                  console.error("Could not find first milestone ID in the order.");
                  return;
             }

             // Contractor generates the Act
             const act1: IAct = await escrowManager.generateAct(
                 order.id,
                 firstMilestoneId,
                 [deliverable1.id], // Link the act to the submitted deliverable
                 contractor.id // User generating the act
             );
             console.log(`Generated Act 1 ID: ${act1.id}, Name: ${act1.name}, Status: ${act1.status}`);

             // Signatures
             let signedAct1 = await escrowManager.signActDocument(act1.id, contractor.id); // Contractor signs first
             console.log(`Act 1 ${act1.id} status after Contractor sign: ${signedAct1.status}`);

             signedAct1 = await escrowManager.signActDocument(act1.id, customer.id); // Customer signs second
             console.log(`Act 1 ${act1.id} status after Customer sign: ${signedAct1.status}`);
             // Payment release is triggered automatically by the ACT_COMPLETED event handler if status is COMPLETED
        }


        // --- Test Auto-Signing (Phase 2 Example) ---
        console.log("\n--- 10. Testing Auto-Signing (Phase 2) ---");
         const secondMilestone = order.milestones[1];
         const secondPhase = roadmap.content.phases[1];
         if(secondMilestone && secondPhase) {
             console.log(`Simulating work and deliverable submission for Phase 2: ${secondPhase.name}...`);
             // Submit a dummy deliverable for phase 2
             const deliverable2 = await escrowManager.submitDeliverable(
                 contractor.id,
                 order.id,
                 secondPhase.id,
                 'Frontend Components V1',
                 { details: 'Basic Vue components structure.'},
                 ['components_v1.zip']
             );
             console.log(`Submitted Deliverable ID: ${deliverable2.id} for Phase: ${secondPhase.id}`);

             // Validate Phase 2 (Assume it passes for this test)
             console.log(`Simulating AI Validation for Phase 2 (assuming compliant)...`);
             // await escrowManager.validateDeliverables(order.id, secondPhase.id); // Optional: run validation

             // Generate act for milestone 2
             console.log(`Generating Act for Phase 2 Milestone: ${secondMilestone.description}...`);
             const act2 = await escrowManager.generateAct(order.id, secondMilestone.id, [deliverable2.id], contractor.id);
             console.log(`Generated Act 2 ID: ${act2.id} for Milestone ${secondMilestone.id}`);

             // Contractor signs Act 2
             await escrowManager.signActDocument(act2.id, contractor.id);
             const act2DocAfterContractorSign = await escrowManager.getDocument(act2.id) as IAct;
             console.log(`Act 2 signed by Contractor. Status: ${act2DocAfterContractorSign?.status}`);

             // Set up auto-sign for customer after a short delay
             const autoSignDelaySeconds = 5;
             // Convert seconds to days for the function (will be a small fraction)
             const autoSignDelayDays = autoSignDelaySeconds / (24 * 60 * 60);
             await escrowManager.setupActAutoSigning(act2.id, autoSignDelayDays);
             console.log(`Auto-signing setup for Act ${act2.id}. Waiting ${autoSignDelaySeconds} seconds for Customer timeout...`);

             // Keep the script running to allow the timeout to trigger
             await new Promise(resolve => setTimeout(resolve, (autoSignDelaySeconds + 2) * 1000)); // Wait for slightly longer than the delay + processing time

              const finalAct2Status = (await escrowManager.getDocument(act2.id) as IAct)?.status;
              console.log(`Final status of Act ${act2.id} after auto-sign period: ${finalAct2Status}`);
              // Payment should have been triggered if it auto-completed

         } else {
             console.warn("Skipping auto-sign test: Could not find second milestone/phase ID.");
         }


        // --- Group Order Scenario ---
        console.log("\n--- 11. Group Order Scenario ---");
        const custA = await escrowManager.createUser('GroupCust A', UserType.CUSTOMER);
        const custB = await escrowManager.createUser('GroupCust B', UserType.CUSTOMER);
        const custC = await escrowManager.createUser('GroupCust C', UserType.CUSTOMER);
        const groupContractor = await escrowManager.createUser('Group Contractor', UserType.CONTRACTOR);

        // Create group order (CustA is initial representative by default)
        const groupOrderMilestones = [
            { description: 'Group Task 1', amount: '900', deadline: new Date('2025-01-15') },
            { description: 'Group Task 2', amount: '600', deadline: new Date('2025-02-15') }
        ];
        let groupOrder = await escrowManager.createGroupOrder(
            [custA.id, custB.id, custC.id],
            'Collaborative Project Omega',
            'A project funded and managed by multiple customers.',
            groupOrderMilestones,
            custA.id // Explicitly set custA as representative
        );
        console.log(`Created Group Order ID: ${groupOrder.id}, Representative: ${groupOrder.representativeId}`);

        // Funding the group order (each contributes)
        console.log(`Funding group order ${groupOrder.id}...`);
        const totalGroupAmount = groupOrder.totalAmount;
        const contributionPerCustomer = totalGroupAmount / groupOrder.customerIds.length;

        // Simulate deposits for each customer
        await escrowManager.depositToUser(custA.id, contributionPerCustomer + 100);
        await escrowManager.depositToUser(custB.id, contributionPerCustomer + 100);
        await escrowManager.depositToUser(custC.id, contributionPerCustomer + 100);

        // Each customer contributes their share
        await escrowManager.contributeFunds(groupOrder.id, custA.id, contributionPerCustomer);
        console.log(`Customer A contributed ${contributionPerCustomer}. Funded: ${ (await escrowManager.getOrder(groupOrder.id))?.fundedAmount }`);
        await escrowManager.contributeFunds(groupOrder.id, custB.id, contributionPerCustomer);
        console.log(`Customer B contributed ${contributionPerCustomer}. Funded: ${ (await escrowManager.getOrder(groupOrder.id))?.fundedAmount }`);
        await escrowManager.contributeFunds(groupOrder.id, custC.id, contributionPerCustomer);
        groupOrder = (await escrowManager.getOrder(groupOrder.id))!; // Refresh order state
        console.log(`Customer C contributed ${contributionPerCustomer}. Final Funded Amount: ${groupOrder.fundedAmount}. Order Status: ${groupOrder.status}`);

        // Assign contractor (must be done by representative - custA)
        console.log(`Assigning contractor ${groupContractor.id} by representative ${custA.id}...`);
        groupOrder = await escrowManager.assignContractor(groupOrder.id, groupContractor.id, custA.id);
        console.log(`Group order status after assignment: ${groupOrder.status}`);

        // Simulate work and deliverable for Group Task 1
        const groupMilestone1 = groupOrder.milestones[0];
        console.log(`Simulating deliverable submission for group milestone: ${groupMilestone1.description}`);
        // We need a roadmap/phase for deliverables, let's skip AI generation and use milestone ID as pseudo-phase for simplicity here
        const groupDeliverable1 = await escrowManager.submitDeliverable(
            groupContractor.id,
            groupOrder.id,
            groupMilestone1.id, // Using milestone ID as phase ID for this simple demo
            'Group Task 1 Results',
            { details: 'Results for the first group task.'}
        );
        console.log(`Submitted Deliverable ID: ${groupDeliverable1.id} for Group Milestone: ${groupMilestone1.id}`);

        // Generate Act (by contractor)
        console.log(`Generating Act for group milestone ${groupMilestone1.id}...`);
        const groupAct1 = await escrowManager.generateAct(groupOrder.id, groupMilestone1.id, [groupDeliverable1.id], groupContractor.id);
        console.log(`Generated Act ID: ${groupAct1.id}, Status: ${groupAct1.status}`);

        // Signing the Act
        console.log('Attempting to sign Act by Contractor...');
        await escrowManager.signActDocument(groupAct1.id, groupContractor.id);
        console.log(`Act status after Contractor sign: ${(await escrowManager.getDocument(groupAct1.id) as IAct)?.status}`);

        console.log('Attempting to sign Act by a non-representative customer (custB)...');
        try {
            await escrowManager.signActDocument(groupAct1.id, custB.id);
        } catch (e: any) {
            console.log(`Successfully caught error (expected): ${e.message}`);
        }

        console.log(`Attempting to sign Act by the representative (custA)...`);
        await escrowManager.signActDocument(groupAct1.id, custA.id);
        console.log(`Act status after Representative sign: ${(await escrowManager.getDocument(groupAct1.id) as IAct)?.status}`);
        // Payment should trigger via event

        console.log("\n--- Demo Finished ---");

    } catch (error: any) {
        console.error("\n--- !!! ERROR OCCURRED !!! ---");
        console.error(`Error Message: ${error.message}`);
        if (error.stack) {
             console.error("Stack Trace:");
             console.error(error.stack);
        }
    } finally {
         // Cleanup any pending timeouts (important for graceful shutdown)
         escrowManager.cleanup();
         console.log("--- Final Cleanup Called ---");
    }
}

// --- Run the demo application ---
runDemo();
