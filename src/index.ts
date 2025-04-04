// Export the main facade
export { EscrowManager } from './escrow-manager';

// Export all interfaces, types, and enums needed by the consumer
export * from './interfaces';
export * from './utils/constants';

// Potentially export service interfaces if defined and needed for advanced use/mocking
// export * from './interfaces/services'; // If you create service interfaces

// Export specific input types if helpful for consumers
// Example: export type { IMilestoneInputData } from './services/order.service';

// Export Services (add CommentService)
// Assuming these services exist and should be exported:
// export * from './services/payment.service';
// export * from './services/dispute-resolution.service';
// export * from './services/document.service';
// export * from './services/group-order.service';
export * from './communication/comment.service'; // Added comment service

// Export Utils (if any public utils)
// export * from './utils/some-util';