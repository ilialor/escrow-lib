import { AIService } from '../src/services/AIService';
import { OrderService } from '../src/services/OrderService';
import { DocumentService } from '../src/services/DocumentService';
import { Order, DocumentType, OrderStatus, MilestoneStatus, Document, Deliverable } from '../src/interfaces';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => {
          return {
            generateContent: jest.fn().mockImplementation(async (prompt) => {
              // Different mock responses based on the prompt
              if (prompt.includes('Definition of Ready')) {
                return {
                  response: {
                    text: () => JSON.stringify({
                      objectives: ["Complete website development"],
                      stakeholders: [{ role: "Developer", responsibilities: ["Coding"] }],
                      successCriteria: ["Working website"],
                      requirements: ["Responsive design"],
                      technicalFeasibility: { assessment: "Feasible", challenges: [] },
                      resourceRequirements: ["1 developer"],
                      risks: [{ description: "Time constraint", mitigation: "Prioritize features" }],
                      acceptanceCriteria: ["Passes all tests"],
                      timeline: { estimatedDuration: "3 months", majorMilestones: ["Design", "Development"] }
                    })
                  }
                };
              } else if (prompt.includes('Roadmap')) {
                return {
                  response: {
                    text: () => JSON.stringify({
                      projectSummary: "Website development project",
                      phases: [
                        {
                          id: "phase-1",
                          name: "Design",
                          description: "Create website design",
                          estimatedDuration: "2 weeks",
                          tasks: [
                            {
                              id: "task-1",
                              description: "Create mockups",
                              estimatedEffort: "1 week",
                              dependencies: []
                            }
                          ],
                          deliverables: ["Design mockups"],
                          milestones: ["Design approval"]
                        }
                      ]
                    })
                  }
                };
              } else if (prompt.includes('Definition of Done')) {
                return {
                  response: {
                    text: () => JSON.stringify({
                      generalCriteria: [
                        {
                          category: "Quality",
                          criteria: ["Code review passed", "Tests written"]
                        }
                      ],
                      phaseCriteria: [
                        {
                          phaseId: "phase-1",
                          criteria: [
                            {
                              deliverable: "Design mockups",
                              acceptanceCriteria: ["Approved by client"]
                            }
                          ]
                        }
                      ],
                      qualityChecklist: ["No bugs", "Responsive on all devices"],
                      approvalProcess: "Client must sign off"
                    })
                  }
                };
              } else if (prompt.includes('Validate')) {
                return {
                  response: {
                    text: () => JSON.stringify({
                      compliant: true,
                      feedback: "All deliverables meet the requirements",
                      suggestions: ["Add more detail to documentation"]
                    })
                  }
                };
              } else if (prompt.includes('specification')) {
                return {
                  response: {
                    text: () => "# Technical Specification\n\nThis is a specification document."
                  }
                };
              } else {
                return {
                  response: {
                    text: () => "Default response"
                  }
                };
              }
            })
          };
        })
      };
    })
  };
});

// Mock for OrderService
const mockOrderService = {
  getOrder: jest.fn()
} as unknown as OrderService;

// Mock for DocumentService
const mockDocumentService = {
  createDocument: jest.fn(),
  getDocumentsByType: jest.fn(),
  getDeliverables: jest.fn()
} as unknown as DocumentService;

describe('AIService', () => {
  let aiService: AIService;
  let mockOrder: Order;
  let mockDocument: Document;
  let mockDeliverables: Deliverable[];

  beforeEach(() => {
    // Create AIService instance with mocked dependencies
    aiService = new AIService('fake-api-key', mockOrderService, mockDocumentService);

    // Reset mocks
    jest.clearAllMocks();

    // Create mock data
    mockOrder = {
      id: 'order-1',
      title: 'Website Development',
      description: 'Create a responsive website',
      platformId: 'platform-1',
      status: OrderStatus.CREATED,
      customerId: 'customer-1',
      contractorId: 'contractor-1',
      milestones: [
        {
          id: 'milestone-1',
          description: 'Design',
          amount: '300',
          status: MilestoneStatus.PENDING,
          createdAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDocument = {
      id: 'doc-1',
      orderId: 'order-1',
      type: DocumentType.DEFINITION_OF_DONE,
      content: {
        generalCriteria: [
          {
            category: 'Quality',
            criteria: ['Code review passed']
          }
        ]
      },
      createdBy: 'platform-1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDeliverables = [
      {
        id: 'deliverable-1',
        orderId: 'order-1',
        phaseId: 'phase-1',
        title: 'Design mockups',
        description: 'Complete website design mockups',
        submittedBy: 'contractor-1',
        submittedAt: new Date()
      }
    ];

    // Set up mocks
    mockOrderService.getOrder.mockResolvedValue(mockOrder);
    mockDocumentService.createDocument.mockImplementation((orderId, type, content, createdBy) => {
      return Promise.resolve({
        id: 'generated-doc-1',
        orderId,
        type,
        content,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    mockDocumentService.getDocumentsByType.mockResolvedValue([]);
    mockDocumentService.getDeliverables.mockResolvedValue(mockDeliverables);
  });

  describe('generateDoR', () => {
    it('should generate a Definition of Ready document', async () => {
      const result = await aiService.generateDoR('order-1');
      
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'order-1',
        DocumentType.DEFINITION_OF_READY,
        expect.objectContaining({
          objectives: expect.any(Array),
          stakeholders: expect.any(Array)
        }),
        'platform-1'
      );
      expect(result).toHaveProperty('id', 'generated-doc-1');
      expect(result).toHaveProperty('type', DocumentType.DEFINITION_OF_READY);
    });

    it('should throw error if order is not found', async () => {
      mockOrderService.getOrder.mockResolvedValue(null);
      
      await expect(aiService.generateDoR('non-existent')).rejects.toThrow();
    });
  });

  describe('generateRoadmap', () => {
    it('should generate a Roadmap document', async () => {
      const result = await aiService.generateRoadmap('order-1');
      
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(mockDocumentService.getDocumentsByType).toHaveBeenCalledWith('order-1', DocumentType.DEFINITION_OF_READY);
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'order-1',
        DocumentType.ROADMAP,
        expect.objectContaining({
          projectSummary: expect.any(String),
          phases: expect.any(Array)
        }),
        'platform-1'
      );
      expect(result).toHaveProperty('id', 'generated-doc-1');
      expect(result).toHaveProperty('type', DocumentType.ROADMAP);
    });
  });

  describe('generateDoD', () => {
    it('should generate a Definition of Done document', async () => {
      const result = await aiService.generateDoD('order-1');
      
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(mockDocumentService.getDocumentsByType).toHaveBeenCalledWith('order-1', DocumentType.ROADMAP);
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'order-1',
        DocumentType.DEFINITION_OF_DONE,
        expect.objectContaining({
          generalCriteria: expect.any(Array),
          phaseCriteria: expect.any(Array)
        }),
        'platform-1'
      );
      expect(result).toHaveProperty('id', 'generated-doc-1');
      expect(result).toHaveProperty('type', DocumentType.DEFINITION_OF_DONE);
    });
  });

  describe('validateDeliverables', () => {
    it('should validate deliverables against DoD criteria', async () => {
      mockDocumentService.getDocumentsByType.mockResolvedValue([mockDocument]);
      
      const result = await aiService.validateDeliverables('order-1', 'phase-1');
      
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(mockDocumentService.getDocumentsByType).toHaveBeenCalledWith('order-1', DocumentType.DEFINITION_OF_DONE);
      expect(mockDocumentService.getDeliverables).toHaveBeenCalledWith('order-1', 'phase-1');
      expect(result).toEqual({
        compliant: true,
        feedback: "All deliverables meet the requirements",
        suggestions: ["Add more detail to documentation"]
      });
    });

    it('should throw error if no DoD document exists', async () => {
      mockDocumentService.getDocumentsByType.mockResolvedValue([]);
      
      await expect(aiService.validateDeliverables('order-1')).rejects.toThrow();
    });

    it('should throw error if no deliverables exist', async () => {
      mockDocumentService.getDocumentsByType.mockResolvedValue([mockDocument]);
      mockDocumentService.getDeliverables.mockResolvedValue([]);
      
      await expect(aiService.validateDeliverables('order-1')).rejects.toThrow();
    });
  });

  describe('generateSpecification', () => {
    it('should generate a specification document', async () => {
      const result = await aiService.generateSpecification('order-1', 'Technical Spec', 'Include database design');
      
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'order-1',
        DocumentType.SPECIFICATION,
        expect.stringContaining('Technical Specification'),
        'platform-1'
      );
      expect(result).toHaveProperty('id', 'generated-doc-1');
      expect(result).toHaveProperty('type', DocumentType.SPECIFICATION);
    });
  });
}); 