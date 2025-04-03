import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Order, Document, DocumentType, Deliverable, DoRContent, RoadmapContent, DoDContent } from '../interfaces';
import { OrderService } from './OrderService';
import { DocumentService } from './DocumentService';

/**
 * Service for AI-powered document generation and validation using Google Gemini API
 */
export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private orderService: OrderService;
  private documentService: DocumentService;

  /**
   * Constructor for AIService
   * @param apiKey Google Gemini API key
   * @param orderService Instance of OrderService
   * @param documentService Instance of DocumentService
   */
  constructor(apiKey: string, orderService: OrderService, documentService: DocumentService) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    this.orderService = orderService;
    this.documentService = documentService;
  }

  /**
   * Generate Definition of Ready (DoR) document for an order
   * @param orderId ID of the order
   * @returns Created DoR document
   */
  async generateDoR(orderId: string): Promise<Document> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const prompt = this.buildDorPrompt(order);
    const result = await this.model.generateContent(prompt);
    const content = this.parseDorContent(result.response.text());

    return this.documentService.createDocument(
      orderId,
      DocumentType.DEFINITION_OF_READY,
      content,
      order.platformId
    );
  }

  /**
   * Generate Roadmap document for an order
   * @param orderId ID of the order
   * @returns Created Roadmap document
   */
  async generateRoadmap(orderId: string): Promise<Document> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Get DoR if exists to use as context
    const dors = await this.documentService.getDocumentsByType(orderId, DocumentType.DEFINITION_OF_READY);
    const dor = dors.length > 0 ? dors[0] : null;

    const prompt = this.buildRoadmapPrompt(order, dor);
    const result = await this.model.generateContent(prompt);
    const content = this.parseRoadmapContent(result.response.text());

    return this.documentService.createDocument(
      orderId,
      DocumentType.ROADMAP,
      content,
      order.platformId
    );
  }

  /**
   * Generate Definition of Done (DoD) document for an order
   * @param orderId ID of the order
   * @returns Created DoD document
   */
  async generateDoD(orderId: string): Promise<Document> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Get Roadmap if exists to use as context
    const roadmaps = await this.documentService.getDocumentsByType(orderId, DocumentType.ROADMAP);
    const roadmap = roadmaps.length > 0 ? roadmaps[0] : null;

    const prompt = this.buildDoDPrompt(order, roadmap);
    const result = await this.model.generateContent(prompt);
    const content = this.parseDoDContent(result.response.text());

    return this.documentService.createDocument(
      orderId,
      DocumentType.DEFINITION_OF_DONE,
      content,
      order.platformId
    );
  }

  /**
   * Validate deliverables against DoD criteria
   * @param orderId ID of the order
   * @param phaseId Optional phase ID to validate specific phase
   * @returns Validation result with compliance status and feedback
   */
  async validateDeliverables(orderId: string, phaseId?: string): Promise<{
    compliant: boolean;
    feedback: string;
    suggestions?: string[];
  }> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Get DoD document
    const dods = await this.documentService.getDocumentsByType(orderId, DocumentType.DEFINITION_OF_DONE);
    if (dods.length === 0) {
      throw new Error(`No Definition of Done document found for order ${orderId}`);
    }
    const dod = dods[0];

    // Get deliverables to validate
    const deliverables = await this.documentService.getDeliverables(orderId, phaseId);
    if (deliverables.length === 0) {
      throw new Error(`No deliverables found for order ${orderId}${phaseId ? ` and phase ${phaseId}` : ''}`);
    }

    const prompt = this.buildValidationPrompt(order, dod, deliverables);
    const result = await this.model.generateContent(prompt);
    
    return this.parseValidationResult(result.response.text());
  }

  /**
   * Generate a specification document for a project
   * @param orderId ID of the order
   * @param title Title of the specification
   * @param description Description or outline of what to include
   * @returns Created specification document
   */
  async generateSpecification(orderId: string, title: string, description: string): Promise<Document> {
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const prompt = `Generate a detailed technical specification document with the title "${title}" for the following project:
    
    Project name: ${order.title}
    Project description: ${order.description}
    
    Additional requirements: ${description}
    
    Please create a comprehensive technical specification that includes:
    1. Introduction and overview
    2. Functional requirements
    3. Technical requirements
    4. Architecture design
    5. Implementation details
    6. Testing strategy
    7. Deployment considerations
    8. Maintenance and support
    
    Format the output as a well-structured Markdown document.`;

    const result = await this.model.generateContent(prompt);
    
    return this.documentService.createDocument(
      orderId,
      DocumentType.SPECIFICATION,
      result.response.text(),
      order.platformId
    );
  }

  // Private helper methods

  private buildDorPrompt(order: Order): string {
    return `Create a Definition of Ready (DoR) document for the following project:
    
    Project name: ${order.title}
    Project description: ${order.description}
    
    The DoR should include:
    1. Project objectives
    2. Stakeholders and their roles
    3. Success criteria
    4. Requirements clarity
    5. Technical feasibility
    6. Resource availability
    7. Risk assessment
    8. Acceptance criteria
    9. Timeline considerations
    
    Format the output as a structured JSON object with the following schema:
    {
      "objectives": string[],
      "stakeholders": { "role": string, "responsibilities": string[] }[],
      "successCriteria": string[],
      "requirements": string[],
      "technicalFeasibility": { "assessment": string, "challenges": string[] },
      "resourceRequirements": string[],
      "risks": { "description": string, "mitigation": string }[],
      "acceptanceCriteria": string[],
      "timeline": { "estimatedDuration": string, "majorMilestones": string[] }
    }`;
  }

  private buildRoadmapPrompt(order: Order, dor: Document | null): string {
    let dorContent = '';
    if (dor) {
      dorContent = `Based on the existing Definition of Ready (DoR) document:
      ${JSON.stringify(dor.content, null, 2)}`;
    }

    return `Create a detailed Roadmap document for the following project:
    
    Project name: ${order.title}
    Project description: ${order.description}
    ${dorContent}
    
    The Roadmap should break down the project into logical phases, each with specific tasks and deliverables.
    
    Format the output as a structured JSON object with the following schema:
    {
      "projectSummary": string,
      "phases": [
        {
          "id": string,
          "name": string,
          "description": string,
          "estimatedDuration": string,
          "tasks": [
            {
              "id": string,
              "description": string,
              "estimatedEffort": string,
              "dependencies": string[]
            }
          ],
          "deliverables": string[],
          "milestones": string[]
        }
      ]
    }`;
  }

  private buildDoDPrompt(order: Order, roadmap: Document | null): string {
    let roadmapContent = '';
    if (roadmap) {
      roadmapContent = `Based on the existing Roadmap document:
      ${JSON.stringify(roadmap.content, null, 2)}`;
    }

    return `Create a Definition of Done (DoD) document for the following project:
    
    Project name: ${order.title}
    Project description: ${order.description}
    ${roadmapContent}
    
    The DoD should define criteria for each phase of the project and general acceptance criteria.
    
    Format the output as a structured JSON object with the following schema:
    {
      "generalCriteria": [
        {
          "category": string,
          "criteria": string[]
        }
      ],
      "phaseCriteria": [
        {
          "phaseId": string,
          "criteria": [
            {
              "deliverable": string,
              "acceptanceCriteria": string[]
            }
          ]
        }
      ],
      "qualityChecklist": string[],
      "approvalProcess": string
    }`;
  }

  private buildValidationPrompt(order: Order, dod: Document, deliverables: Deliverable[]): string {
    return `Validate if the following deliverables satisfy the Definition of Done (DoD) criteria for this project:
    
    Project name: ${order.title}
    Project description: ${order.description}
    
    Definition of Done:
    ${JSON.stringify(dod.content, null, 2)}
    
    Deliverables to validate:
    ${JSON.stringify(deliverables, null, 2)}
    
    Please analyze the deliverables against the DoD criteria and determine if they are compliant.
    
    Format your response as a JSON object:
    {
      "compliant": boolean,
      "feedback": string,
      "suggestions": string[]
    }
    
    Where:
    - "compliant" is true if the deliverables meet the DoD criteria, false otherwise
    - "feedback" provides detailed explanation of the validation result
    - "suggestions" is an array of recommendations for improvement (if needed)`;
  }

  private parseDorContent(text: string): DoRContent {
    try {
      // Extract JSON from text (in case AI wraps it in markdown or explanations)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON content from AI response");
      }
      
      return JSON.parse(jsonMatch[0]) as DoRContent;
    } catch (error) {
      console.error("Failed to parse DoR content:", error);
      // Fallback to basic structure
      return {
        objectives: ["Project objective needs to be defined"],
        stakeholders: [{ role: "Undefined", responsibilities: ["To be defined"] }],
        successCriteria: ["Success criteria needs to be defined"],
        requirements: ["Requirements need to be defined"],
        technicalFeasibility: { assessment: "Not assessed", challenges: ["To be evaluated"] },
        resourceRequirements: ["Resource requirements need to be defined"],
        risks: [{ description: "Risks need to be evaluated", mitigation: "Mitigation strategy to be defined" }],
        acceptanceCriteria: ["Acceptance criteria need to be defined"],
        timeline: { estimatedDuration: "Not estimated", majorMilestones: ["Milestones to be defined"] }
      };
    }
  }

  private parseRoadmapContent(text: string): RoadmapContent {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON content from AI response");
      }
      
      return JSON.parse(jsonMatch[0]) as RoadmapContent;
    } catch (error) {
      console.error("Failed to parse Roadmap content:", error);
      // Fallback to basic structure
      return {
        projectSummary: "Project summary needs to be defined",
        phases: [
          {
            id: "phase-1",
            name: "Initial Phase",
            description: "Description needs to be defined",
            estimatedDuration: "Not estimated",
            tasks: [
              {
                id: "task-1",
                description: "Task needs to be defined",
                estimatedEffort: "Not estimated",
                dependencies: []
              }
            ],
            deliverables: ["Deliverables need to be defined"],
            milestones: ["Milestones need to be defined"]
          }
        ]
      };
    }
  }

  private parseDoDContent(text: string): DoDContent {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON content from AI response");
      }
      
      return JSON.parse(jsonMatch[0]) as DoDContent;
    } catch (error) {
      console.error("Failed to parse DoD content:", error);
      // Fallback to basic structure
      return {
        generalCriteria: [
          {
            category: "Quality",
            criteria: ["Quality criteria need to be defined"]
          }
        ],
        phaseCriteria: [
          {
            phaseId: "phase-1",
            criteria: [
              {
                deliverable: "Deliverable",
                acceptanceCriteria: ["Acceptance criteria need to be defined"]
              }
            ]
          }
        ],
        qualityChecklist: ["Quality checklist items need to be defined"],
        approvalProcess: "Approval process needs to be defined"
      };
    }
  }

  private parseValidationResult(text: string): {
    compliant: boolean;
    feedback: string;
    suggestions?: string[];
  } {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON content from AI response");
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Failed to parse validation result:", error);
      // Fallback
      return {
        compliant: false,
        feedback: "Failed to parse AI validation results",
        suggestions: ["Please try the validation again or check the deliverables manually"]
      };
    }
  }
} 