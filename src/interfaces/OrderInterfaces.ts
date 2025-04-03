/**
 * Status values for orders
 */
// Import enums from constants instead of duplicating them
import { OrderStatus, MilestoneStatus } from '../utils/constants';

// Definitions for Order, OrderMilestone, GroupOrder were removed as they were duplicates
// or superseded by IOrder/IMilestone from base.ts

// Note: Use IOrder from base.ts instead
// Note: Use IMilestone from base.ts instead
// Note: For group orders, use IOrder from base.ts with customerIds property