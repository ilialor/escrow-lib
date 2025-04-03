/**
 * Escrow Library - главная точка входа
 */

// Импортируем и экспортируем класс EscrowManager
import { EscrowManager } from './escrow-manager';
export { EscrowManager };
export default EscrowManager;

// Экспортируем сервисы
export { UserService } from './services/user-service';
export { OrderService } from './services/order-service';
export { DocumentService } from './services/document-service';
export { AIService } from './services/ai-service';

// Экспортируем интерфейсы
export * from './interfaces';

// Экспортируем константы
// export * from './utils/constants'; // Removed to avoid export conflicts

// Экспортируем модели
// export * from './models'; // Removed to avoid export conflicts 