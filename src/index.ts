// Export the main facade
export { EscrowManager } from './escrow-manager';

// Export all interfaces, types, and enums needed by the consumer
export * from './interfaces';
export * from './utils/constants';

// Potentially export service interfaces if defined and needed for advanced use/mocking
// export * from './interfaces/services'; // If you create service interfaces

// Export specific input types if helpful for consumers
export type { IMilestoneInputData } from './services/order.service';