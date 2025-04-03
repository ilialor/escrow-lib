# Escrow Library

Библиотека для управления эскроу-счетами и групповыми заказами с функциями коммуникации, документооборота и AI-интеграции.

## Возможности

- **Управление пользователями** - создание пользователей с различными ролями (заказчик, исполнитель, платформа)
- **Управление заказами** - создание, изменение и управление заказами
- **Групповые заказы** - поддержка заказов с несколькими участниками
- **Вехи** - разделение проектов на этапы с отдельными бюджетами
- **Эскроу-счета** - безопасное хранение средств до подтверждения выполнения работ
- **Акты** - формирование и подписание актов выполненных работ
- **Голосование** - система голосования для изменения представителя группы
- **Документы** - хранение и управление документами проекта
- **Коммуникация** - система обсуждений и сообщений внутри проектов
- **AI-интеграция** - автоматическая генерация документов и проверка соответствия критериям с использованием Google Gemini

## Установка

```bash
npm install escrow-lib
```

## Основные понятия

### Пользователи

В системе существуют три типа пользователей:
- **Заказчик (Customer)** - создает заказы и оплачивает их
- **Исполнитель (Contractor)** - выполняет работы по заказам
- **Платформа (Platform)** - выступает арбитром, взимает комиссию

### Заказы и вехи

Заказы содержат одну или несколько вех (milestones), каждая со своим бюджетом и описанием работ. Средства хранятся на эскроу-счете заказа и освобождаются по мере выполнения вех.

### Акты приемки

По завершении вехи исполнитель формирует акт выполненных работ, который должен быть подписан исполнителем и заказчиком (или представителем группы заказчиков).

### Документы

Система поддерживает различные типы документов, включая Definition of Ready (DoR), Definition of Done (DoD), дорожные карты и результаты работ, с возможностью автоматической генерации и проверки с использованием AI.

## Пример использования

```typescript
import { EscrowManager, UserType, OrderStatus } from 'escrow-lib';

// Инициализация с поддержкой AI
const escrowManager = new EscrowManager('ваш-gemini-api-ключ');

// Создание пользователей
const customer = await escrowManager.createUser('Иван', UserType.CUSTOMER);
const contractor = await escrowManager.createUser('Сергей', UserType.CONTRACTOR);

// Пополнение баланса заказчика
await escrowManager.deposit(customer.id, '1000');

// Создание заказа с вехами
const order = await escrowManager.createOrder(
  customer.id,
  'Разработка сайта',
  'Создание корпоративного сайта',
  [
    { description: 'Дизайн', amount: '300', deadline: new Date('2023-12-15') },
    { description: 'Верстка', amount: '300', deadline: new Date('2023-12-31') },
    { description: 'Программирование', amount: '400', deadline: new Date('2024-01-31') }
  ]
);

// Назначение исполнителя
await escrowManager.assignContractor(order.id, contractor.id);

// Финансирование заказа
await escrowManager.contributeFunds(order.id, customer.id, '1000');

// Автоматическая генерация документов с помощью AI
const dor = await escrowManager.generateDoR(order.id);
const roadmap = await escrowManager.generateRoadmap(order.id);
const dod = await escrowManager.generateDoD(order.id);

// Отправка результатов работы
const deliverable = await escrowManager.submitDeliverable(
  contractor.id,
  order.id,
  roadmap.content.phases[0].id,
  'Дизайн сайта',
  { description: 'Готовый дизайн всех страниц' },
  ['design1.png', 'design2.png']
);

// Проверка результатов на соответствие DoD
const validationResult = await escrowManager.validateDeliverables(
  order.id,
  roadmap.content.phases[0].id
);

// Если результаты соответствуют требованиям, создаем акт
if (validationResult.compliant) {
  // Создание акта выполненных работ
  const act = await escrowManager.generateAct(
    order.id,
    order.milestones[0].id,
    [deliverable.id]
  );
  
  // Подписание акта исполнителем
  await escrowManager.signActDocument(act.id, contractor.id);
  
  // Подписание акта заказчиком
  await escrowManager.signActDocument(act.id, customer.id);
}

// Подписка на события
escrowManager.on('milestone:completed', data => {
  console.log(`Веха ${data.milestoneId} помечена как выполненная`);
});

escrowManager.on('act:signed', data => {
  console.log(`Акт ${data.actId} подписан пользователем ${data.userId}`);
});
```

## Документация

Подробная документация доступна в директории [docs](docs):

- [README.md](docs/README.md) - Общая информация
- [users.md](docs/users.md) - Управление пользователями
- [orders.md](docs/orders.md) - Управление заказами и вехами
- [group-orders.md](docs/group-orders.md) - Групповые заказы
- [documents.md](docs/documents.md) - Работа с документами
- [document-management.md](docs/document-management.md) - Документооборот с AI
- [communication.md](docs/communication.md) - Система коммуникации
- [events.md](docs/events.md) - События и подписки

## Лицензия

MIT 