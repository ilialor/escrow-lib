import {
    IOrder,
    IDoRDocument,
    DocumentType,
    IRoadmapDocument,
    IRoadmapPhase,
    IDoDDocument,
    IDoDCriterion,
    IValidationResult,
    IDeliverableDocument,
    IValidationCriterionDetail
} from '../../interfaces/base';
import { IAiProvider } from '../../interfaces/ai-provider.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock implementation of the AI Provider for testing and development.
 * Provides simulated responses without calling external APIs.
 */
export class MockAiProvider implements IAiProvider {
    private readonly LOG_PREFIX = '[MockAiProvider]';

    constructor() {
        console.log(`${this.LOG_PREFIX} Initialized.`);
    }

    private async simulateDelay(ms: number): Promise<void> {
        await new Promise(res => setTimeout(res, ms));
    }

    // --- Generation Methods (Simulated) ---

    async generateDoR(order: IOrder, creatorUserId: string): Promise<Omit<IDoRDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Simulating DoR generation for order ${order.id}...`);
        await this.simulateDelay(150);

        const customerText = order.isGroupOrder ? `group of customers (Representative: ${order.representativeId || 'N/A'})` : `customer ${order.customerIds[0]}`;
        const mockPrompt = `Generate Definition of Ready (DoR) for project: \\"${order.title}\\" for ${customerText}. Description: \\"${order.description}\\" Milestones: ${order.milestones.map(m => m.description).join(', ')}.`;
        console.log(`${this.LOG_PREFIX} Mock Prompt: ${mockPrompt}`);

        const dorContent: IDoRDocument['content'] = {
            format: "Markdown documents, potentially Figma designs",
            volume: `Estimated ${order.milestones.length * 2}-${order.milestones.length * 5} work units.`,
            resources: ["Detailed project brief from customers", "Access to relevant existing systems/APIs", "Regular availability of customer representative for feedback"],
            recommendations: ["Define clear, measurable acceptance criteria per phase.", "Weekly status sync-ups recommended.", `Validate technical approach for milestone '${order.milestones[0]?.description || 'first phase'}'.`],
            timeline: "High-level timeline based on milestones. Detailed sprint planning needed.",
            risks: ["Scope creep risk.", "Delays in receiving feedback from the customer group.", "Technical unknowns during implementation."]
        };

        const dorData: Omit<IDoRDocument, 'id' | 'createdAt'> = {
            orderId: order.id,
            type: DocumentType.DEFINITION_OF_READY,
            name: `Mock DoR for ${order.title}`,
            content: dorContent,
            createdBy: creatorUserId,
        };
        console.log(`${this.LOG_PREFIX} Simulated DoR content generated for order ${order.id}`);
        return dorData;
    }

    async generateRoadmap(order: IOrder, creatorUserId: string): Promise<Omit<IRoadmapDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Simulating Roadmap generation for order ${order.id}...`);
        await this.simulateDelay(200);

        const mockPrompt = `Generate Roadmap for project: \\"${order.title}\\" Milestones: ${JSON.stringify(order.milestones.map(m => ({ desc: m.description, amount: m.amount })))}. Group order: ${order.isGroupOrder}.`;
        console.log(`${this.LOG_PREFIX} Mock Prompt: ${mockPrompt}`);

        const phases: IRoadmapPhase[] = order.milestones.map((milestone, index) => ({
            id: uuidv4(),
            name: `Phase ${index + 1}: ${milestone.description}`,
            description: `Completing requirements for the '${milestone.description}' milestone. Budget: ${milestone.amount}. Target: ${milestone.deadline.toLocaleDateString()}.`,
            deliverables: [`Completed ${milestone.description} work`, `Phase ${index + 1} Report`],
            estimatedDuration: `${Math.ceil(milestone.amount / 600) + 1} week(s)`,
            dependsOn: [], // Dependencies handled below
        }));

        // Add dependencies
        phases.forEach((phase, index) => {
            if (index > 0 && phases[index - 1]) {
                phase.dependsOn = [phases[index - 1].id];
            }
        });

        const roadmapContent: IRoadmapDocument['content'] = { phases };
        const roadmapData: Omit<IRoadmapDocument, 'id' | 'createdAt'> = {
            orderId: order.id,
            type: DocumentType.ROADMAP,
            name: `Mock Roadmap for ${order.title}`,
            content: roadmapContent,
            createdBy: creatorUserId,
        };
        console.log(`${this.LOG_PREFIX} Simulated Roadmap content generated for order ${order.id}`);
        return roadmapData;
    }

    async generateDoD(order: IOrder, roadmap: IRoadmapDocument, creatorUserId: string): Promise<Omit<IDoDDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Simulating DoD generation for order ${order.id}...`);
        await this.simulateDelay(180);

        const customerAcceptanceText = order.isGroupOrder ? `results accepted by Customer Representative via signed Act` : `results accepted by Customer via signed Act`;
        const mockPrompt = `Generate DoD for project \\"${order.title}\\" based on phases: ${JSON.stringify(roadmap.content.phases.map(p => p.name))}. Customer acceptance: ${customerAcceptanceText}.`;
        console.log(`${this.LOG_PREFIX} Mock Prompt: ${mockPrompt}`);

        const criteria: IDoDCriterion[] = [];
        roadmap.content.phases.forEach(phase => {
            criteria.push({
                id: uuidv4(),
                phaseId: phase.id,
                description: `All deliverables for Phase '${phase.name}' (${phase.deliverables.join(', ')}) submitted and meet functional specs.`,
                checkMethod: "Review submitted items, Functional testing.",
            });
            criteria.push({
                id: uuidv4(),
                phaseId: phase.id,
                description: `Code (if applicable) passes quality checks (linting, tests). Documentation updated.`,
                checkMethod: "Code review, Test reports, Doc review.",
            });
            criteria.push({
                id: uuidv4(),
                phaseId: phase.id,
                description: `Phase '${phase.name}' ${customerAcceptanceText}.`,
                checkMethod: "Verified completed Act of Work.",
            });
        });

        const dodContent: IDoDDocument['content'] = { criteria };
        const dodData: Omit<IDoDDocument, 'id' | 'createdAt'> = {
            orderId: order.id,
            type: DocumentType.DEFINITION_OF_DONE,
            name: `Mock DoD for ${order.title}`,
            content: dodContent,
            createdBy: creatorUserId,
        };
        console.log(`${this.LOG_PREFIX} Simulated DoD content generated for order ${order.id}`);
        return dodData;
    }

    // --- Validation Method (Simulated) ---

    async validateDeliverables(
        order: IOrder,
        phaseId: string,
        deliverables: IDeliverableDocument[],
        dod: IDoDDocument
    ): Promise<IValidationResult> {
        console.log(`${this.LOG_PREFIX} Simulating validation of ${deliverables.length} deliverables for phase ${phaseId} (Order ${order.id})...`);
        await this.simulateDelay(250);

        const mockPrompt = `Validate deliverables [${deliverables.map(d => d.name).join(', ')}] for phase \\"${phaseId}\\" against DoD. Project: \\"${order.title}\\" Phase Criteria: ${JSON.stringify(dod.content.criteria.filter(c => c.phaseId === phaseId).map(c => c.description))}`;
        console.log(`${this.LOG_PREFIX} Mock Prompt: ${mockPrompt}`);

        const phaseCriteria = dod.content.criteria.filter(c => c.phaseId === phaseId);
        if (phaseCriteria.length === 0) {
            console.warn(`${this.LOG_PREFIX} No DoD criteria found for phase ${phaseId}. Assuming compliant.`);
            return { orderId: order.id, phaseId, deliverableIds: deliverables.map(d => d.id), compliant: true, overallScore: 100, details: [], checkedAt: new Date() };
        }

        const details: IValidationCriterionDetail[] = [];
        phaseCriteria.forEach(criterion => {
            let isCompliant = Math.random() > 0.15; // ~85% chance of being compliant
            let reason = isCompliant ? undefined : "Mock AI: Minor non-compliance detected.";
            let score = isCompliant ? 1.0 : +(Math.random() * 0.5 + 0.2).toFixed(2); // Score between 0.2 and 0.7 if not compliant

            // Acceptance criteria always passes in simulation
            if (criterion.description.toLowerCase().includes('accepted by customer')) {
                isCompliant = true;
                reason = undefined;
                score = 1.0;
            }

            details.push({ criterionId: criterion.id, description: criterion.description, compliant: isCompliant, reason, score });
        });

        const totalCriteria = phaseCriteria.length;
        const overallScore = totalCriteria > 0 ? (details.reduce((sum, d) => sum + (d.score || 0), 0) / totalCriteria) * 100 : 100;
        const overallCompliant = details.every(d => d.compliant); // Strict compliance: all criteria must pass

        const result: IValidationResult = {
            orderId: order.id,
            phaseId: phaseId,
            deliverableIds: deliverables.map(d => d.id),
            compliant: overallCompliant,
            overallScore: parseFloat(overallScore.toFixed(2)),
            details: details,
            checkedAt: new Date(),
        };

        console.log(`${this.LOG_PREFIX} Simulated validation complete for phase ${phaseId}. Overall Compliance: ${result.compliant}, Score: ${result.overallScore}%`);
        return result;
    }
}
