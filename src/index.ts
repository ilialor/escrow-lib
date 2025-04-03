// Экспортируем только основной класс
import { EscrowManager } from './escrow-manager';

export default EscrowManager;
export { EscrowManager };

// Re-export models
export * from './models';

// Re-export interfaces
export * from './interfaces/base';
export * from './interfaces/services';

// Re-export utils
export * from './utils/constants';

// Re-export services
export { AIService } from './services/ai-service';

export * from './interfaces';

// Реэкспортируем сервисы для возможного расширения
export { UserService } from './services/UserService';
export { OrderService } from './services/OrderService';
export { DocumentService } from './services/DocumentService';
export { AIService } from './services/AIService'; 