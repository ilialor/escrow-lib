# Escrow Library

Escrow Library - это модульная библиотека, предназначенная для управления условными депозитами (escrow) в групповых заказах. Она обеспечивает безопасное хранение средств, поэтапные выплаты и коммуникацию между участниками.

## Установка

```bash
npm install escrow-lib
```

## Основные возможности

- **Управление пользователями**: создание и аутентификация пользователей различных типов (заказчики, исполнители, администраторы платформы)
- **Управление заказами**: создание заказов, установка вех (milestones), контроль статусов
- **Групповые заказы**: создание заказов с несколькими участниками-заказчиками, распределение взносов
- **Вехи (Milestones)**: разделение работы на этапы с отдельными бюджетами
- **Эскроу-счета**: безопасное хранение средств до подтверждения выполнения работ
- **Акты выполненных работ**: цифровая подпись для подтверждения завершения этапов
- **Голосование**: механизм для выбора представителя группы заказчиков
- **Документы**: хранение и утверждение документов, связанных с заказом
- **Коммуникация**: обсуждения и обмен сообщениями между участниками заказа

## Ключевые концепции

### Пользователи

Библиотека поддерживает три типа пользователей:
- **Заказчик (Customer)**: создает заказы и вносит средства
- **Исполнитель (Contractor)**: выполняет работы и получает оплату
- **Платформа (Platform)**: административные функции и арбитраж

### Заказы

Заказы содержат информацию о работе, бюджете и участниках:
- Индивидуальные заказы создаются одним заказчиком
- Групповые заказы могут иметь нескольких заказчиков с разными долями участия
- Заказы проходят через различные статусы: от создания до завершения
- Заказы могут включать несколько вех (milestones) с отдельными бюджетами

### Групповые заказы

Особая функция библиотеки - работа с групповыми заказами:
- Несколько заказчиков могут участвовать в одном заказе
- Каждый заказчик может вносить разную сумму для финансирования
- Представитель группы выбирается через голосование и представляет интересы всех заказчиков
- Все участники могут отслеживать статус заказа и участвовать в коммуникации

### Акты и оплата

- Исполнитель отмечает вехи как завершенные, создавая акт выполненных работ
- Акт подписывается исполнителем и представителем заказчиков
- После подписания акта средства автоматически переводятся исполнителю

## Использование

### Базовый пример

```typescript
import { EscrowManager, UserType, OrderStatus } from 'escrow-lib';

// Создаем экземпляр менеджера
const escrowManager = new EscrowManager();

// Создаем пользователей
async function setupUsers() {
  const customer = await escrowManager.createUser('Alice', UserType.CUSTOMER);
  const contractor = await escrowManager.createUser('Bob', UserType.CONTRACTOR);
  
  // Пополняем баланс заказчика
  await escrowManager.deposit(customer.id, '1000');
  
  return { customer, contractor };
}

// Создаем заказ
async function createOrder(customerId) {
  const milestones = [
    { description: 'Первый этап работ', amount: '300' },
    { description: 'Второй этап работ', amount: '700' }
  ];
  
  const order = await escrowManager.createOrder(
    customerId,
    'Название заказа',
    'Описание заказа',
    milestones
  );
  
  return order;
}

// Создаем групповой заказ
async function createGroupOrder(customerIds) {
  const milestones = [
    { description: 'Первый этап работ', amount: '500' },
    { description: 'Второй этап работ', amount: '500' }
  ];
  
  const order = await escrowManager.createGroupOrder(
    customerIds,
    'Групповой заказ',
    'Описание группового заказа',
    milestones
  );
  
  return order;
}

// Финансируем групповой заказ
async function fundGroupOrder(orderId, contributionsMap) {
  for (const [userId, amount] of Object.entries(contributionsMap)) {
    await escrowManager.contributeFunds(orderId, userId, amount);
  }
  
  const order = await escrowManager.getOrder(orderId);
  return order;
}

// Пример работы с документами
async function handleDocuments(orderId, customerId, contractorId) {
  // Создаем документ
  const document = await escrowManager.createDocument(
    orderId,
    'DEFINITION_OF_READY',
    'Содержимое документа...',
    customerId
  );
  
  // Утверждаем документ
  await escrowManager.approveDocument(document.id, contractorId);
}
```

### События

Библиотека использует систему событий для отслеживания изменений:

```typescript
// Подписываемся на события создания заказа
escrowManager.on('order:created', (order) => {
  console.log(`Создан новый заказ: ${order.title}`);
});

// Подписываемся на события финансирования заказа
escrowManager.on('order:funded', (order) => {
  console.log(`Заказ полностью профинансирован: ${order.id}`);
});

// Подписываемся на завершение вех
escrowManager.on('milestone:completed', ({ orderId, milestoneId }) => {
  console.log(`Веха ${milestoneId} заказа ${orderId} отмечена как завершенная`);
});
```

## Документация API

Для получения подробной информации об API см. документацию в директории `/docs`.

## Примеры использования групповых заказов

### Создание группового заказа

```typescript
// Создаем нескольких заказчиков
const customer1 = await escrowManager.createUser('Customer 1', UserType.CUSTOMER);
const customer2 = await escrowManager.createUser('Customer 2', UserType.CUSTOMER);
const customer3 = await escrowManager.createUser('Customer 3', UserType.CUSTOMER);

// Пополняем балансы
await escrowManager.deposit(customer1.id, '600');
await escrowManager.deposit(customer2.id, '300');
await escrowManager.deposit(customer3.id, '100');

// Создаем групповой заказ с тремя участниками
const groupOrder = await escrowManager.createGroupOrder(
  [customer1.id, customer2.id, customer3.id],
  'Групповой проект',
  'Описание группового проекта',
  [{ description: 'Полный объем работ', amount: '1000' }]
);

// Финансируем заказ
await escrowManager.contributeFunds(groupOrder.id, customer1.id, '600');
await escrowManager.contributeFunds(groupOrder.id, customer2.id, '300');
await escrowManager.contributeFunds(groupOrder.id, customer3.id, '100');

// Получаем информацию о взносах
const contributions = await escrowManager.getOrderContributions(groupOrder.id);
console.log(contributions); // { [customer1.id]: 600, [customer2.id]: 300, [customer3.id]: 100 }
```

### Голосование за представителя

```typescript
// Голосуем за нового представителя
const changed = await escrowManager.voteForRepresentative(
  groupOrder.id,
  customer1.id, // голосующий
  customer2.id  // кандидат
);

if (changed) {
  console.log('Представитель группы изменен');
}

// Другие участники также могут голосовать
await escrowManager.voteForRepresentative(
  groupOrder.id,
  customer3.id, // голосующий
  customer2.id  // кандидат
);
``` 