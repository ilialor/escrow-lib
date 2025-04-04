import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, TaskType, FunctionDeclarationSchema, SchemaType, FunctionCallingMode } from '@google/generative-ai';
import {
    IOrder, IDoRDocument, DocumentType, IRoadmapDocument, IRoadmapPhase,
    IDoDDocument, IDoDCriterion, IValidationResult, IDeliverableDocument, IValidationCriterionDetail
} from '../../interfaces/base';
import { IAiProvider } from '../../interfaces/ai-provider.interface';
import { v4 as uuidv4 } from 'uuid';

// --- Helper function to structure JSON output (Optional but recommended) ---
// See: https://ai.google.dev/docs/function_calling
// This helps ensure the AI returns data in the format we expect.
const structuredDoRSchema: FunctionDeclarationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        format: { type: SchemaType.STRING, description: "Recommended formats for project deliverables (e.g., 'Markdown, Figma')" },
        volume: { type: SchemaType.STRING, description: "Estimated volume or scope (e.g., '10-15 pages')" },
        resources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "List of required resources or inputs from the customer." },
        recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Key recommendations for project setup or execution." },
        timeline: { type: SchemaType.STRING, description: "High-level timeline suggestions or communication cadence." },
        risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Potential risks identified for the project." },
    },
    required: ['format', 'volume', 'resources', 'recommendations', 'timeline', 'risks'],
};

// Similar schemas can be defined for Roadmap, DoD, and Validation if needed for structured output.

export class GoogleGeminiProvider implements IAiProvider {
    private genAI: GoogleGenerativeAI;
    private model;
    private readonly LOG_PREFIX = '[GoogleGeminiProvider]';

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error(`${this.LOG_PREFIX} API Key is required.`);
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Consider making model name configurable, e.g., 'gemini-1.5-flash' or 'gemini-1.5-pro'
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log(`${this.LOG_PREFIX} Initialized with model 'gemini-1.5-flash'.`);
    }

    // --- Prompt Generation Helpers ---

    private createCustomerContext(order: IOrder): string {
        if (order.isGroupOrder) {
            return `The project involves a group of ${order.customerIds.length} customers. Their designated representative is user ID: ${order.representativeId || 'Not yet set'}. Communication and approvals should primarily go through the representative.`;
        }
        return `The project is for a single customer (User ID: ${order.customerIds[0]}).`;
    }

    private createOrderSummary(order: IOrder): string {
        return `Project Title: "${order.title}"\nProject Description: "${order.description}"\nMilestones:\n${order.milestones.map(m => `- ${m.description} (Budget: ${m.amount}, Deadline: ${m.deadline.toLocaleDateString()})`).join('\n')}`;
    }

    // --- Generation Methods ---

    async generateDoR(order: IOrder, creatorUserId: string): Promise<Omit<IDoRDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Generating DoR for order ${order.id}...`);
        const customerContext = this.createCustomerContext(order);
        const orderSummary = this.createOrderSummary(order);

        const prompt = `Generate a "Definition of Ready" (DoR) for the following software development project. The DoR should outline expectations and requirements before work begins.\n\nProject Details:\n${orderSummary}\n\nCustomer Context:\n${customerContext}\n\nBased on this, provide the necessary resources, recommended deliverable formats, estimated volume/scope, key recommendations, timeline suggestions, and potential risks.\n\nRespond with ONLY the required information structured as JSON matching the requested schema.`;

        try {
            const result = await this.model.generateContent(
                {
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    // Enable structured output via function calling
                    tools: [{
                        functionDeclarations: [{
                            name: "structuredDoROutput",
                            description: "Formats the Definition of Ready content.",
                            parameters: structuredDoRSchema,
                        }]
                    }],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingMode.ANY, // Use enum value
                            allowedFunctionNames: ["structuredDoROutput"],
                        }
                    }
                }
            );

            const response = result.response;
            const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

            if (functionCall?.name === 'structuredDoROutput' && functionCall.args) {
                const dorContent: IDoRDocument['content'] = functionCall.args as any;
                // Basic validation (optional)
                if (!dorContent.format || !dorContent.resources) {
                    throw new Error('AI response missing required DoR fields.');
                }
                const dorData: Omit<IDoRDocument, 'id' | 'createdAt'> = {
                    orderId: order.id,
                    type: DocumentType.DEFINITION_OF_READY,
                    name: `DoR for ${order.title}`,
                    content: dorContent,
                    createdBy: creatorUserId,
                };
                console.log(`${this.LOG_PREFIX} DoR generated successfully for order ${order.id}`);
                return dorData;
            } else {
                // Handle cases where function call didn't happen or failed
                const fallbackText = response.text();
                console.warn(`${this.LOG_PREFIX} Could not get structured DoR output. Falling back to text:`, fallbackText);
                // Attempt to create a basic DoR from text (less reliable)
                const dorData: Omit<IDoRDocument, 'id' | 'createdAt'> = {
                    orderId: order.id,
                    type: DocumentType.DEFINITION_OF_READY,
                    name: `DoR for ${order.title} (from text)`,
                    content: { format: 'Text fallback - see recommendations', volume: 'N/A', resources: [], recommendations: [fallbackText.substring(0, 500)], timeline: 'N/A', risks: [] },
                    createdBy: creatorUserId,
                };
                return dorData;
            }
        } catch (error: any) {
            console.error(`${this.LOG_PREFIX} Error generating DoR:`, error);
            throw new Error(`Failed to generate DoR via AI: ${error.message}`);
        }
    }

    async generateRoadmap(order: IOrder, creatorUserId: string): Promise<Omit<IRoadmapDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Generating Roadmap for order ${order.id}...`);
        const orderSummary = this.createOrderSummary(order);
        const customerContext = this.createCustomerContext(order);

        const prompt = `Generate a project roadmap document based on the following project details. Create distinct phases corresponding to each milestone. Assign a unique ID to each phase. Estimate duration based on budget (higher budget implies longer duration). Define expected deliverables for each phase. Determine phase dependencies (each phase depends on the previous one).\n\nProject Details:\n${orderSummary}\n\nCustomer Context:\n${customerContext}\n\nRespond ONLY with a JSON object containing a single key "phases", which is an array of phase objects. Each phase object should have: "id" (string, unique), "name" (string), "description" (string), "deliverables" (array of strings), "estimatedDuration" (string, e.g., "2-3 weeks"), and "dependsOn" (array of phase IDs, empty for the first phase).`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            // Attempt to parse JSON - more robust error handling needed for production
            const parsed = JSON.parse(text.trim());

            if (!parsed.phases || !Array.isArray(parsed.phases)) {
                throw new Error('AI response did not contain a valid "phases" array.');
            }

            // Basic validation of phase structure (optional)
            const phases: IRoadmapPhase[] = parsed.phases.map((p: any) => ({
                id: p.id || uuidv4(), // Assign UUID if missing
                name: p.name || 'Unnamed Phase',
                description: p.description || 'No description',
                deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
                estimatedDuration: p.estimatedDuration || 'N/A',
                dependsOn: Array.isArray(p.dependsOn) ? p.dependsOn : [],
            }));

            const roadmapData: Omit<IRoadmapDocument, 'id' | 'createdAt'> = {
                orderId: order.id,
                type: DocumentType.ROADMAP,
                name: `Roadmap for ${order.title}`,
                content: { phases },
                createdBy: creatorUserId,
            };
            console.log(`${this.LOG_PREFIX} Roadmap generated successfully for order ${order.id}`);
            return roadmapData;
        } catch (error: any) {
            console.error(`${this.LOG_PREFIX} Error generating Roadmap:`, error);
            throw new Error(`Failed to generate Roadmap via AI: ${error.message}`);
        }
    }

    async generateDoD(order: IOrder, roadmap: IRoadmapDocument, creatorUserId: string): Promise<Omit<IDoDDocument, 'id' | 'createdAt'>> {
        console.log(`${this.LOG_PREFIX} Generating DoD for order ${order.id}...`);
        if (!roadmap?.content?.phases?.length) throw new Error('Roadmap with phases is required.');

        const orderSummary = this.createOrderSummary(order);
        const customerContext = this.createCustomerContext(order);
        const phaseSummary = roadmap.content.phases.map(p => `Phase "${p.name}" (ID: ${p.id}) expects deliverables: ${p.deliverables.join(', ')}`).join('\n');

        const prompt = `Generate a "Definition of Done" (DoD) document for the following project, based on its roadmap phases. Create 2-3 specific, checkable criteria for EACH phase.
        Each criterion must relate directly to the phase's deliverables or general quality standards (code quality, documentation, testing). Ensure one criterion explicitly mentions acceptance by the customer representative (if group order) or customer (if standard order).\n\nProject Details:\n${orderSummary}\n\nCustomer Context:\n${customerContext}\n\nRoadmap Phases:\n${phaseSummary}\n\nRespond ONLY with a JSON object containing a single key "criteria", which is an array of criterion objects. Each criterion object must have: "id" (string, unique), "phaseId" (string, linking to the roadmap phase ID), "description" (string, the criterion text), and "checkMethod" (string, how to verify it).`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(text.trim());

            if (!parsed.criteria || !Array.isArray(parsed.criteria)) {
                throw new Error('AI response did not contain a valid "criteria" array.');
            }

             // Basic validation
            const criteria: IDoDCriterion[] = parsed.criteria.map((c: any): IDoDCriterion => ({
                id: c.id || uuidv4(),
                phaseId: c.phaseId || '', // Important: Ensure phaseId is linked
                description: c.description || 'No description',
                checkMethod: c.checkMethod || 'Manual review',
            })).filter((c: IDoDCriterion) => c.phaseId && roadmap.content.phases.some((p: IRoadmapPhase) => p.id === c.phaseId)); // Filter out criteria with invalid phase IDs

            if (criteria.length === 0 && parsed.criteria.length > 0) {
                 console.warn(`${this.LOG_PREFIX} Parsed criteria but none matched valid phase IDs from the roadmap.`);
            }

            const dodData: Omit<IDoDDocument, 'id' | 'createdAt'> = {
                orderId: order.id,
                type: DocumentType.DEFINITION_OF_DONE,
                name: `DoD for ${order.title}`,
                content: { criteria },
                createdBy: creatorUserId,
            };
            console.log(`${this.LOG_PREFIX} DoD generated successfully for order ${order.id}`);
            return dodData;
        } catch (error: any) {
            console.error(`${this.LOG_PREFIX} Error generating DoD:`, error);
            throw new Error(`Failed to generate DoD via AI: ${error.message}`);
        }
    }

    async validateDeliverables(order: IOrder, phaseId: string, deliverables: IDeliverableDocument[], dod: IDoDDocument): Promise<IValidationResult> {
        console.log(`${this.LOG_PREFIX} Validating deliverables for phase ${phaseId} (Order ${order.id})...`);
        if (!dod?.content?.criteria?.length) throw new Error('DoD with criteria is required.');
        if (!deliverables?.length) return { orderId: order.id, phaseId, deliverableIds: [], compliant: false, overallScore: 0, details: [], checkedAt: new Date() };

        const phaseCriteria = dod.content.criteria.filter(c => c.phaseId === phaseId);
        if (phaseCriteria.length === 0) {
            console.warn(`${this.LOG_PREFIX} No DoD criteria found for phase ${phaseId}. Assuming compliant.`);
            return { orderId: order.id, phaseId, deliverableIds: deliverables.map(d => d.id), compliant: true, overallScore: 100, details: [], checkedAt: new Date() };
        }

        const deliverableSummary = deliverables.map(d => `- ${d.name}: ${d.content.details}`).join('\n');
        const criteriaSummary = phaseCriteria.map(c => `- Criterion: ${c.description} (Check: ${c.checkMethod})`).join('\n');
        const customerContext = this.createCustomerContext(order);

        const prompt = `Assess the submitted deliverables for a project phase against the corresponding Definition of Done (DoD) criteria. Provide a compliance status (true/false), an optional reason if not compliant, and an estimated compliance score (0.0 to 1.0) for EACH criterion.\n\nProject: "${order.title}"\n${customerContext}\nPhase ID: ${phaseId}\n\nSubmitted Deliverables:\n${deliverableSummary}\n\nDoD Criteria for this Phase:\n${criteriaSummary}\n\nRespond ONLY with a JSON object containing a single key "details", which is an array of assessment objects. Each assessment object must match a criterion and have: "criterionId" (string, from DoD), "description" (string, from DoD), "compliant" (boolean), "reason" (string, optional explanation if not compliant), and "score" (number between 0.0 and 1.0).\n`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(text.trim());

            if (!parsed.details || !Array.isArray(parsed.details)) {
                throw new Error('AI response did not contain valid "details" array.');
            }

            const details: IValidationCriterionDetail[] = [];
            let overallScoreSum = 0;

            // Match AI response back to original criteria
            phaseCriteria.forEach(criterion => {
                const aiDetail = parsed.details.find((d: any) => d.criterionId === criterion.id || d.description === criterion.description);
                if (aiDetail) {
                    const compliant = typeof aiDetail.compliant === 'boolean' ? aiDetail.compliant : false;
                    const score = typeof aiDetail.score === 'number' && aiDetail.score >= 0 && aiDetail.score <= 1 ? aiDetail.score : 0;
                    details.push({
                        criterionId: criterion.id,
                        description: criterion.description,
                        compliant: compliant,
                        reason: compliant ? undefined : (aiDetail.reason || 'AI indicated non-compliance'),
                        score: score,
                    });
                    overallScoreSum += score;
                } else {
                    // If AI missed a criterion, mark as non-compliant
                    details.push({
                        criterionId: criterion.id,
                        description: criterion.description,
                        compliant: false,
                        reason: 'AI assessment missing for this criterion.',
                        score: 0,
                    });
                }
            });

            const totalCriteria = phaseCriteria.length;
            const overallScore = totalCriteria > 0 ? (overallScoreSum / totalCriteria) * 100 : 100;
            const overallCompliant = details.every(d => d.compliant);

            const validationResult: IValidationResult = {
                orderId: order.id,
                phaseId: phaseId,
                deliverableIds: deliverables.map(d => d.id),
                compliant: overallCompliant,
                overallScore: parseFloat(overallScore.toFixed(2)),
                details: details,
                checkedAt: new Date(),
            };
            console.log(`${this.LOG_PREFIX} Deliverable validation complete for phase ${phaseId}. Compliance: ${validationResult.compliant}`);
            return validationResult;

        } catch (error: any) {
            console.error(`${this.LOG_PREFIX} Error validating deliverables:`, error);
            throw new Error(`Failed to validate deliverables via AI: ${error.message}`);
        }
    }

}
