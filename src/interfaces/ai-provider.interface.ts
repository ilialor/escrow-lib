import {
    IOrder,
    IDocument,
    IDoRDocument,
    IRoadmapDocument,
    IDoDDocument,
    IValidationResult,
    IDeliverableDocument,
    ISpecificationDocument
} from './base';

/**
 * Defines the contract for AI service providers.
 * Each method corresponds to an AI-powered feature.
 */
export interface IAiProvider {
    /**
     * Generates a Definition of Ready document based on order details.
     * @param order - The order context.
     * @param creatorUserId - The ID of the user initiating the request.
     * @returns A promise resolving to the data needed to create the DoR document (excluding ID and timestamps).
     */
    generateDoR(order: IOrder, creatorUserId: string): Promise<Omit<IDoRDocument, 'id' | 'createdAt'>>;

    /**
     * Generates a project roadmap document based on order milestones.
     * @param order - The order context.
     * @param creatorUserId - The ID of the user initiating the request.
     * @returns A promise resolving to the data for the Roadmap document.
     */
    generateRoadmap(order: IOrder, creatorUserId: string): Promise<Omit<IRoadmapDocument, 'id' | 'createdAt'>>;

    /**
     * Generates a Definition of Done document based on an order and its roadmap.
     * @param order - The order context.
     * @param roadmap - The corresponding roadmap document.
     * @param creatorUserId - The ID of the user initiating the request.
     * @returns A promise resolving to the data for the DoD document.
     */
    generateDoD(order: IOrder, roadmap: IRoadmapDocument, creatorUserId: string): Promise<Omit<IDoDDocument, 'id' | 'createdAt'>>;

    /**
     * Validates submitted deliverables for a phase against the Definition of Done criteria.
     * @param order - The order context.
     * @param phaseId - The ID of the roadmap phase being validated.
     * @param deliverables - An array of submitted deliverable documents for the phase.
     * @param dod - The relevant Definition of Done document.
     * @returns A promise resolving to the validation result.
     */
    validateDeliverables(
        order: IOrder,
        phaseId: string,
        deliverables: IDeliverableDocument[],
        dod: IDoDDocument
    ): Promise<IValidationResult>;

    // Potential future methods like generateSpecification:
    /*
    generateSpecification(order: IOrder, creatorUserId: string): Promise<Omit<ISpecificationDocument, 'id' | 'createdAt'>>;
    */
}
