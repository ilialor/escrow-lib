import axios from 'axios';
import { IAIService, IDoRDocument, IRoadmapDocument, IDoDDocument, IDoDComplianceResult, IOrder, IDocument } from '../interfaces/services';
import { DocumentType } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for AI operations using Google Gemini API
 */
export class AIService implements IAIService {
  private apiKey: string = '';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest';

  /**
   * Set Google Gemini API key
   * @param apiKey API key for Google Gemini
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Generate a Definition of Ready document based on order details
   * @param order Order object
   * @returns DoR document with AI-generated content
   */
  async generateDoR(order: IOrder): Promise<IDoRDocument> {
    try {
      const prompt = `
        You are a professional project manager. Create a Definition of Ready document in JSON format for the following project:
        
        Project title: ${order.title}
        Project description: ${order.description}
        
        Please format your response as a JSON object with the following structure:
        {
          "format": "Describe the format of deliverables expected",
          "volume": "Describe the expected volume of work",
          "resources": ["List of required resources"],
          "recommendations": ["Professional recommendations for this type of project"],
          "timeline": "Suggested timeline for the project",
          "risks": ["Potential risks to consider"]
        }
        
        Only respond with the JSON object, no introduction or explanation.
      `;

      const response = await this.callGeminiAPI(prompt);
      
      // Parse JSON from the response
      let content;
      try {
        content = JSON.parse(response);
      } catch (error: any) {
        throw new Error(`Failed to parse AI response as JSON: ${response}`);
      }

      // Build the DoR document
      return {
        id: uuidv4(),
        orderId: order.id,
        documentType: DocumentType.DEFINITION_OF_READY,
        content,
        version: 1,
        createdBy: 'SYSTEM',
        dateCreated: new Date(),
        dateUpdated: new Date(),
        approvals: new Set<string>(['SYSTEM']),
        name: `DoR - ${order.title}`,
        approve: (userId: string) => {},
        isApproved: () => false,
        updateContent: (content: any, userId: string) => {}
      };
    } catch (error: any) {
      console.error('Error generating DoR:', error);
      throw new Error(`Failed to generate Definition of Ready: ${error.message}`);
    }
  }

  /**
   * Generate a roadmap document with project phases
   * @param order Order object
   * @returns Roadmap document with AI-generated phases
   */
  async generateRoadmap(order: IOrder): Promise<IRoadmapDocument> {
    try {
      const milestoneDescriptions = order.milestones.map(
        (m, i) => `Milestone ${i + 1}: ${m.description} (Budget: ${m.amount})`
      ).join('\n');

      const prompt = `
        You are a professional project manager. Create a detailed project roadmap in JSON format for the following project:
        
        Project title: ${order.title}
        Project description: ${order.description}
        Milestones: 
        ${milestoneDescriptions}
        
        Please format your response as a JSON object with the following structure:
        {
          "phases": [
            {
              "id": "unique-id",
              "name": "Phase name",
              "description": "Detailed description of this phase",
              "deliverables": ["List of deliverables expected in this phase"],
              "estimatedDuration": "Estimated duration in days or weeks",
              "dependsOn": ["ids of phases this depends on, if any"]
            }
          ]
        }
        
        Only respond with the JSON object, no introduction or explanation.
      `;

      const response = await this.callGeminiAPI(prompt);
      
      // Parse JSON from the response
      let content;
      try {
        content = JSON.parse(response);
      } catch (error: any) {
        throw new Error(`Failed to parse AI response as JSON: ${response}`);
      }

      // Build the roadmap document
      return {
        id: uuidv4(),
        orderId: order.id,
        documentType: DocumentType.ROADMAP,
        content,
        version: 1,
        createdBy: 'SYSTEM',
        dateCreated: new Date(),
        dateUpdated: new Date(),
        approvals: new Set<string>(['SYSTEM']),
        name: `Roadmap - ${order.title}`,
        approve: (userId: string) => {},
        isApproved: () => false,
        updateContent: (content: any, userId: string) => {}
      };
    } catch (error: any) {
      console.error('Error generating roadmap:', error);
      throw new Error(`Failed to generate roadmap: ${error.message}`);
    }
  }

  /**
   * Generate a Definition of Done document with acceptance criteria
   * @param order Order object
   * @param roadmap Previously generated roadmap document
   * @returns DoD document with AI-generated criteria
   */
  async generateDoD(order: IOrder, roadmap: IRoadmapDocument): Promise<IDoDDocument> {
    try {
      const phasesDescription = roadmap.content.phases
        .map(phase => `Phase: ${phase.name}\nDeliverables: ${phase.deliverables.join(', ')}`)
        .join('\n\n');

      const prompt = `
        You are a professional quality assurance expert. Create a Definition of Done document in JSON format with clear, automatable acceptance criteria for the following project:
        
        Project title: ${order.title}
        Project description: ${order.description}
        
        Project phases and deliverables:
        ${phasesDescription}
        
        Please format your response as a JSON object with the following structure:
        {
          "criteria": [
            {
              "id": "unique-id",
              "description": "Clear description of the criterion",
              "checkMethod": "How to verify this criterion automatically when possible",
              "phaseId": "ID of the related phase from the roadmap"
            }
          ]
        }
        
        Ensure criteria are specific, measurable, and automatable where possible.
        Only respond with the JSON object, no introduction or explanation.
      `;

      const response = await this.callGeminiAPI(prompt);
      
      // Parse JSON from the response
      let content;
      try {
        content = JSON.parse(response);
      } catch (error: any) {
        throw new Error(`Failed to parse AI response as JSON: ${response}`);
      }

      // Build the DoD document
      return {
        id: uuidv4(),
        orderId: order.id,
        documentType: DocumentType.DEFINITION_OF_DONE,
        content,
        version: 1,
        createdBy: 'SYSTEM',
        dateCreated: new Date(),
        dateUpdated: new Date(),
        approvals: new Set<string>(['SYSTEM']),
        name: `DoD - ${order.title}`,
        approve: (userId: string) => {},
        isApproved: () => false,
        updateContent: (content: any, userId: string) => {}
      };
    } catch (error: any) {
      console.error('Error generating DoD:', error);
      throw new Error(`Failed to generate Definition of Done: ${error.message}`);
    }
  }

  /**
   * Check deliverables against DoD criteria
   * @param deliverables Array of submitted deliverable documents
   * @param dod DoD document with criteria
   * @returns Compliance result with details
   */
  async checkDoD(deliverables: IDocument[], dod: IDoDDocument): Promise<IDoDComplianceResult> {
    try {
      // Convert deliverables to a string format for the prompt
      const deliverablesText = deliverables.map(d => 
        `Deliverable: ${d.name || 'Unnamed'}\nContent: ${
          typeof d.content === 'string' 
            ? d.content 
            : JSON.stringify(d.content)
        }`
      ).join('\n\n');

      // Convert DoD criteria to a string format for the prompt
      const criteriaText = dod.content.criteria.map(c => 
        `Criteria ID: ${c.id}\nDescription: ${c.description}\nCheck Method: ${c.checkMethod}`
      ).join('\n\n');

      const prompt = `
        You are a quality assurance expert. Evaluate if the following deliverables meet the Definition of Done criteria.
        
        DEFINITION OF DONE CRITERIA:
        ${criteriaText}
        
        DELIVERABLES TO EVALUATE:
        ${deliverablesText}
        
        Please format your response as a JSON object with the following structure:
        {
          "compliant": true/false,
          "details": [
            {
              "criterionId": "id from the DoD",
              "description": "description of the criterion",
              "compliant": true/false,
              "reason": "explanation of compliance or non-compliance"
            }
          ],
          "overallScore": 0-100,
          "recommendations": ["suggestions for improvements if needed"]
        }
        
        Only respond with the JSON object, no introduction or explanation.
      `;

      const response = await this.callGeminiAPI(prompt);
      
      // Parse JSON from the response
      let result;
      try {
        result = JSON.parse(response);
      } catch (error: any) {
        throw new Error(`Failed to parse AI response as JSON: ${response}`);
      }

      return result;
    } catch (error: any) {
      console.error('Error checking DoD compliance:', error);
      throw new Error(`Failed to check compliance with Definition of Done: ${error.message}`);
    }
  }

  /**
   * Auto-fill a form based on order data
   * @param order Order data
   * @param formType Type of form to fill
   * @param additionalData Additional data needed for the form
   * @returns Auto-filled form content
   */
  async autoFillForm(order: IOrder, formType: string, additionalData?: any): Promise<any> {
    try {
      // Create different prompts based on form type
      let prompt = '';
      let templateStructure = '';
      
      switch (formType) {
        case 'act_of_work':
          templateStructure = `{
            "title": "Act of Work",
            "orderDetails": {
              "orderNumber": "string",
              "orderTitle": "string",
              "completionDate": "string"
            },
            "workCompleted": [
              {
                "description": "string",
                "quantity": "number",
                "unit": "string"
              }
            ],
            "conclusion": "string",
            "totalCost": "string"
          }`;
          
          prompt = `
            You are a contract specialist. Create an Act of Work in JSON format for the following completed order:
            
            Order title: ${order.title}
            Order description: ${order.description}
            Milestones: ${order.milestones.map(m => m.description).join(', ')}
            Total cost: ${order.totalCost}
            
            Additional information:
            ${JSON.stringify(additionalData || {})}
            
            Please format your response according to this template:
            ${templateStructure}
            
            Only respond with the JSON object, no introduction or explanation.
          `;
          break;
          
        case 'specification':
          templateStructure = `{
            "projectName": "string",
            "version": "string",
            "overview": "string",
            "requirements": [
              {
                "id": "string",
                "description": "string",
                "priority": "high/medium/low"
              }
            ],
            "constraints": ["string"],
            "assumptions": ["string"]
          }`;
          
          prompt = `
            You are a business analyst. Create a technical specification in JSON format for the following project:
            
            Project title: ${order.title}
            Project description: ${order.description}
            
            Additional information:
            ${JSON.stringify(additionalData || {})}
            
            Please format your response according to this template:
            ${templateStructure}
            
            Only respond with the JSON object, no introduction or explanation.
          `;
          break;
          
        default:
          throw new Error(`Unsupported form type: ${formType}`);
      }

      const response = await this.callGeminiAPI(prompt);
      
      // Parse JSON from the response
      try {
        return JSON.parse(response);
      } catch (error: any) {
        throw new Error(`Failed to parse AI response as JSON: ${response}`);
      }
    } catch (error: any) {
      console.error(`Error auto-filling ${formType} form:`, error);
      throw new Error(`Failed to auto-fill form: ${error.message}`);
    }
  }

  /**
   * Call the Google Gemini API with a prompt
   * @param prompt The prompt to send to the API
   * @returns The API response text
   * @private
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not set. Call setApiKey() first.');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract text from response
      if (response.data && 
          response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content && 
          response.data.candidates[0].content.parts && 
          response.data.candidates[0].content.parts[0] && 
          response.data.candidates[0].content.parts[0].text) {
        return response.data.candidates[0].content.parts[0].text.trim();
      } else {
        throw new Error('Unexpected API response structure');
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response from API server');
      } else {
        throw error;
      }
    }
  }
} 