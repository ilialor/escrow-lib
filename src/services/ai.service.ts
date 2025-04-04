import {
    IOrder, IDocument, IDoRDocument, DocumentType, IRoadmapDocument, IRoadmapPhase,
    IDoDDocument, IDoDCriterion, IValidationResult, IDeliverableDocument, IValidationCriterionDetail,
    ISpecificationDocument // Added for potential future use
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class AIService {
    private apiKey: string | null = null;
    private enabled: boolean = false;

    constructor(apiKey?: string) {
        if (apiKey) {
            this.setApiKey(apiKey);
        } else {
            console.warn('[AIService] AI Service initialized WITHOUT API Key. AI features disabled.');
        }
    }

    setApiKey(apiKey: string): void {
        if (!apiKey) {
             this.apiKey = null;
             this.enabled = false;
             console.warn('[AIService] AI Service API Key removed. AI features disabled.');
        } else {
             this.apiKey = apiKey;
             this.enabled = true;
             console.log('[AIService] AI Service API Key set and enabled.');
             // TODO: Potentially initialize a real AI client library here (e.g., GoogleGenerativeAI)
        }
    }

    isEnabled(): boolean {
        return this.enabled && !!this.apiKey;
    }

    // --- Generation Methods (Simulated) ---

    async generateDoR(order: IOrder, creatorUserId: string): Promise<Omit<IDoRDocument, 'id' | 'createdAt'>> {
        if (!this.isEnabled()) throw new Error("AI Service is not configured or enabled.");
        console.log(`[AIService] Simulating DoR generation for order ${order.id}...`);

        // Simulate API call delay
        await new Promise(res => setTimeout(res, 150));

        // Mock prompt based on order
        const mockPrompt = `Generate Definition of Ready (DoR) for project: "${order.title}" described as "${order.description}". Key milestones: ${order.milestones.map(m=>m.description).join(', ')}.`;
        console.log(`[AIService] Mock Prompt: ${mockPrompt}`);

        // Simulate AI response structure
        const dorContent: IDoRDocument['content'] = {
            format: "Markdown documents, Figma designs (for design phases)",
            volume: `Estimated ${order.milestones.length * 2}-${order.milestones.length * 4} pages/screens overall.`,
            resources: ["Detailed project brief", "Access to existing brand guidelines", "Stakeholder availability for Q&A"],
            recommendations: ["Define clear acceptance criteria for each milestone.", "Establish regular communication cadence.", `Confirm technical stack for phases like '${order.milestones[1]?.description || 'development'}'.`],
            timeline: "Suggest weekly check-ins, phase reviews upon completion.",
            risks: ["Potential scope creep if requirements change.", "Delays in feedback/approval.", "Integration challenges if multiple systems involved."]
        };

        const dorData: Omit<IDoRDocument, 'id' | 'createdAt'> = {
            orderId: order.id,
            type: DocumentType.DEFINITION_OF_READY,
            name: `AI Generated DoR for ${order.title}`,
            content: dorContent,
            createdBy: creatorUserId, // Attributed to user initiating generation
        };
        console.log(`[AIService] Simulated DoR content generated for order ${order.id}`);
        return dorData;
    }

    async generateRoadmap(order: IOrder, creatorUserId: string): Promise<Omit<IRoadmapDocument, 'id' | 'createdAt'>> {
         if (!this.isEnabled()) throw new Error("AI Service is not configured or enabled.");
         console.log(`[AIService] Simulating Roadmap generation for order ${order.id}...`);
         await new Promise(res => setTimeout(res, 200));

         const mockPrompt = `Generate a project roadmap with phases based on the milestones for project: "${order.title}". Milestones: ${JSON.stringify(order.milestones.map(m => ({ desc: m.description, amount: m.amount })))}.`;
         console.log(`[AIService] Mock Prompt: ${mockPrompt}`);

         const phases: IRoadmapPhase[] = order.milestones.map((milestone, index) => {
             const phaseId = uuidv4();
             // Update milestone with linked phaseId (if OrderService is enhanced to support this)
             // milestone.roadmapPhaseId = phaseId; // This should ideally happen in OrderService or Facade

             return {
                 id: phaseId,
                 name: `Phase ${index + 1}: ${milestone.description}`,
                 description: `Focuses on completing the requirements for the '${milestone.description}' milestone. Budget allocation: ${milestone.amount}. Expected by: ${milestone.deadline.toLocaleDateString()}`,
                 deliverables: [`Completed ${milestone.description} artefacts/code`, `Status Report for Phase ${index + 1}`],
                 estimatedDuration: `${Math.ceil(milestone.amount / 500) + 1} weeks`, // Mock duration based on amount
                 dependsOn: index > 0 ? [order.milestones[index - 1].roadmapPhaseId || 'previous_phase_id_placeholder'] : [], // Link to previous phase ID if available
             };
         });

         // Post-process dependencies if IDs were assigned within the loop
         phases.forEach((phase, index) => {
             if (index > 0 && phases[index - 1]) {
                phase.dependsOn = [phases[index - 1].id];
             }
         });


         const roadmapContent: IRoadmapDocument['content'] = { phases };
         const roadmapData: Omit<IRoadmapDocument, 'id' | 'createdAt'> = {
             orderId: order.id,
             type: DocumentType.ROADMAP,
             name: `AI Generated Roadmap for ${order.title}`,
             content: roadmapContent,
             createdBy: creatorUserId,
         };
          console.log(`[AIService] Simulated Roadmap content generated for order ${order.id}`);
         return roadmapData;
     }

     async generateDoD(order: IOrder, roadmap: IRoadmapDocument, creatorUserId: string): Promise<Omit<IDoDDocument, 'id' | 'createdAt'>> {
          if (!this.isEnabled()) throw new Error("AI Service is not configured or enabled.");
          if (!roadmap || roadmap.content.phases.length === 0) throw new Error("Valid Roadmap document is required to generate DoD.");
          console.log(`[AIService] Simulating DoD generation for order ${order.id} based on Roadmap ${roadmap.id}...`);
          await new Promise(res => setTimeout(res, 180));

          const mockPrompt = `Generate Definition of Done (DoD) criteria for project "${order.title}" based on the following roadmap phases: ${JSON.stringify(roadmap.content.phases.map(p => p.name))}`;
          console.log(`[AIService] Mock Prompt: ${mockPrompt}`);

          const criteria: IDoDCriterion[] = [];
          roadmap.content.phases.forEach(phase => {
              // Criterion 1: Deliverable Check
              criteria.push({
                  id: uuidv4(),
                  phaseId: phase.id,
                  description: `All specified deliverables for Phase '${phase.name}' (${phase.deliverables.join(', ')}) are submitted and meet functional requirements outlined in Specification/DoR.`,
                  checkMethod: "Review submitted artefacts against requirements, functional testing.",
              });
              // Criterion 2: Quality Check (Example)
              criteria.push({
                  id: uuidv4(),
                  phaseId: phase.id,
                  description: `Code (if applicable) adheres to project coding standards and passes static analysis checks. Documentation is clear and up-to-date.`,
                  checkMethod: "Code review, automated linting/analysis tool report, documentation review.",
              });
               // Criterion 3: Acceptance (Generic)
              criteria.push({
                  id: uuidv4(),
                  phaseId: phase.id,
                  description: `Phase '${phase.name}' results accepted by Customer via signed Act of Work.`,
                  checkMethod: "Confirmation of completed Act of Work document.",
              });
          });

          const dodContent: IDoDDocument['content'] = { criteria };
          const dodData: Omit<IDoDDocument, 'id' | 'createdAt'> = {
              orderId: order.id,
              type: DocumentType.DEFINITION_OF_DONE,
              name: `AI Generated DoD for ${order.title}`,
              content: dodContent,
              createdBy: creatorUserId,
          };
          console.log(`[AIService] Simulated DoD content generated for order ${order.id}`);
          return dodData;
     }

    // --- Validation Method (Simulated) ---

     async validateDeliverables(
        order: IOrder,
        phaseId: string,
        deliverables: IDeliverableDocument[], // Actual submitted deliverables
        dod: IDoDDocument // The DoD to check against
     ): Promise<IValidationResult> {
        if (!this.isEnabled()) throw new Error("AI Service is not configured or enabled.");
        if (!dod) throw new Error("DoD document is required for validation.");
        if (deliverables.length === 0) {
             console.warn(`[AIService] No deliverables provided for phase ${phaseId} to validate.`);
             // Return a default non-compliant result
             return {
                 orderId: order.id, phaseId, deliverableIds: [], compliant: false, overallScore: 0, details: [], checkedAt: new Date()
             };
        }
        console.log(`[AIService] Simulating validation of ${deliverables.length} deliverables for phase ${phaseId} (Order ${order.id}) against DoD ${dod.id}...`);
        await new Promise(res => setTimeout(res, 250)); // Simulate delay

        const mockPrompt = `Validate the following deliverables [${deliverables.map(d=>d.name).join(', ')}] for phase "${phaseId}" against the DoD criteria for project "${order.title}". DoD Criteria for Phase: ${JSON.stringify(dod.content.criteria.filter(c=>c.phaseId===phaseId).map(c=>c.description))}`;
        console.log(`[AIService] Mock Prompt: ${mockPrompt}`);


        const phaseCriteria = dod.content.criteria.filter(c => c.phaseId === phaseId);
        if (phaseCriteria.length === 0) {
            console.warn(`[AIService] No DoD criteria found for phase ${phaseId}. Assuming compliant.`);
            return {
                 orderId: order.id, phaseId, deliverableIds: deliverables.map(d => d.id), compliant: true, overallScore: 100, details: [], checkedAt: new Date()
            };
        }

        let compliantCount = 0;
        const details: IValidationCriterionDetail[] = [];

        phaseCriteria.forEach(criterion => {
            // Simulate validation logic based on criterion description
            let isCompliant = true;
            let reason = undefined;
            let score = 1.0;

            // Example: Randomly fail some checks or based on keywords
            if (criterion.description.toLowerCase().includes('code') && Math.random() < 0.3) {
                isCompliant = false;
                reason = "Mock AI Reason: Code quality metrics below threshold or standards not fully met.";
                score = 0.2;
            } else if (criterion.description.toLowerCase().includes('documentation') && Math.random() < 0.2) {
                 isCompliant = false;
                 reason = "Mock AI Reason: Documentation missing key sections or unclear explanations.";
                 score = 0.4;
            } else if (Math.random() < 0.1) { // Random small chance of failure
                isCompliant = false;
                reason = "Mock AI Reason: Minor deviation detected during review.";
                score = 0.7;
            }

             // Acceptance criteria always passes in simulation unless act is rejected (handled elsewhere)
             if (criterion.description.toLowerCase().includes('accepted by customer')) {
                 isCompliant = true; // Assume true unless explicitly rejected
                 reason = undefined;
                 score = 1.0;
             }


            if (isCompliant) {
                compliantCount++;
            }
            details.push({
                criterionId: criterion.id,
                description: criterion.description,
                compliant: isCompliant,
                reason: reason,
                score: score,
            });
        });

        const totalCriteria = phaseCriteria.length;
        const overallScore = totalCriteria > 0 ? (details.reduce((sum, d) => sum + (d.score || 0), 0) / totalCriteria) * 100 : 100;
        // Define compliance threshold (e.g., 80% score AND all critical criteria met)
        const overallCompliant = overallScore >= 80; // Simplified: just score based

        const result: IValidationResult = {
            orderId: order.id,
            phaseId: phaseId,
            deliverableIds: deliverables.map(d => d.id),
            compliant: overallCompliant,
            overallScore: parseFloat(overallScore.toFixed(2)),
            details: details,
            checkedAt: new Date(),
        };

        console.log(`[AIService] Simulated validation complete for phase ${phaseId}. Overall Compliance: ${result.compliant}, Score: ${result.overallScore}%`);
        return result;
     }
}