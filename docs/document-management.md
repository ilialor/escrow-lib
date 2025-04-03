# Документооборот в Escrow Library

Escrow Library предоставляет расширенные возможности для работы с документами, включая интеграцию с Google Gemini AI для автоматизации создания и проверки документов.

## Основные компоненты

### Типы документов

В библиотеке поддерживаются следующие типы документов:

- `DEFINITION_OF_READY` (DoR) - описывает требования и ожидания перед началом работ
- `ROADMAP` - структура проекта с фазами и ожидаемыми результатами
- `DEFINITION_OF_DONE` (DoD) - критерии приемки работ
- `DELIVERABLE` - фактические результаты работы, сдаваемые исполнителем
- `ACT_OF_WORK` - акт выполненных работ
- `SPECIFICATION` - спецификация проекта или его части

### Акты выполненных работ

Акты имеют следующие статусы:

- `CREATED` - акт создан
- `SIGNED_CONTRACTOR` - подписан исполнителем
- `SIGNED_CUSTOMER` - подписан заказчиком
- `SIGNED_PLATFORM` - подписан платформой
- `COMPLETED` - завершен (требуется как минимум 2 подписи)
- `REJECTED` - отклонен

## Интеграция с AI

Библиотека интегрируется с Google Gemini AI для:

1. Автоматической генерации DoR
2. Создания дорожной карты проекта
3. Формирования критериев приемки (DoD)
4. Проверки соответствия результатов работы критериям DoD
5. Автозаполнения форм и актов

## Настройка AI

```typescript
// Включение AI при инициализации
const escrowManager = new EscrowManager('ваш-gemini-api-ключ');

// Или добавление ключа позже
escrowManager.setAiApiKey('ваш-gemini-api-ключ');
```

## Примеры использования

### Создание документов

```typescript
// Генерация Definition of Ready
const dor = await escrowManager.generateDoR(orderId);

// Генерация дорожной карты
const roadmap = await escrowManager.generateRoadmap(orderId);

// Генерация Definition of Done (требуется наличие дорожной карты)
const dod = await escrowManager.generateDoD(orderId);
```

### Работа с результатами

```typescript
// Отправка результата работы (deliverable)
const deliverable = await escrowManager.submitDeliverable(
  userId,
  orderId,
  phaseId,
  'Результат фазы проектирования',
  { details: 'Подробное описание результата' },
  ['file1.pdf', 'file2.docx'] // опциональные файлы
);

// Проверка результатов на соответствие DoD
const validationResult = await escrowManager.validateDeliverables(
  orderId,
  phaseId
);

console.log(`Соответствие критериям: ${validationResult.compliant}`);
console.log(`Общая оценка: ${validationResult.overallScore}`);

// Детали по каждому критерию
validationResult.details.forEach(detail => {
  console.log(`${detail.description}: ${detail.compliant ? 'Соответствует' : 'Не соответствует'}`);
  if (!detail.compliant && detail.reason) {
    console.log(`Причина: ${detail.reason}`);
  }
});
```

### Работа с актами

```typescript
// Создание акта для вехи с указанием связанных deliverables
const act = await escrowManager.generateAct(
  orderId,
  milestoneId,
  [deliverable1Id, deliverable2Id]
);

// Подписание акта
await escrowManager.signActDocument(actId, contractorId);
await escrowManager.signActDocument(actId, customerId);

// Настройка автоматического подписания по истечении срока
await escrowManager.setupActAutoSigning(actId, 3); // 3 дня
```

## События

Для мониторинга работы с документами можно подписаться на события:

```typescript
escrowManager.on(EscrowEvents.DOR_GENERATED, data => {
  console.log(`DoR создан для заказа ${data.orderId}`);
});

escrowManager.on(EscrowEvents.ROADMAP_GENERATED, data => {
  console.log(`Дорожная карта создана для заказа ${data.orderId}`);
});

escrowManager.on(EscrowEvents.DOD_GENERATED, data => {
  console.log(`DoD создан для заказа ${data.orderId}`);
});

escrowManager.on(EscrowEvents.DELIVERABLE_SUBMITTED, data => {
  console.log(`Новый результат отправлен для фазы ${data.phaseId}`);
});

escrowManager.on(EscrowEvents.DELIVERABLE_VALIDATED, data => {
  console.log(`Результаты проверены: ${data.compliant ? 'соответствуют' : 'не соответствуют'} DoD`);
});

escrowManager.on(EscrowEvents.ACT_CREATED, act => {
  console.log(`Создан новый акт: ${act.name}`);
});

escrowManager.on(EscrowEvents.ACT_SIGNED, data => {
  console.log(`Акт ${data.actId} подписан пользователем ${data.userId}`);
});

escrowManager.on(EscrowEvents.ACT_COMPLETED, data => {
  console.log(`Акт ${data.actId} завершен`);
});
```

## Структура документов

### DoR (Definition of Ready)

```typescript
interface IDoRDocument {
  content: {
    format: string;      // Требуемый формат материалов
    volume: string;      // Ожидаемый объем работы
    resources: string[]; // Необходимые ресурсы
    recommendations: string[]; // Рекомендации для проекта
    timeline: string;    // Рекомендуемые сроки
    risks: string[];     // Потенциальные риски
  }
}
```

### Roadmap

```typescript
interface IRoadmapDocument {
  content: {
    phases: {
      id: string;        // Уникальный ID фазы
      name: string;      // Название фазы
      description: string; // Описание
      deliverables: string[]; // Ожидаемые результаты
      estimatedDuration: string; // Предполагаемая длительность
      dependsOn?: string[]; // Зависимости от других фаз
    }[]
  }
}
```

### DoD (Definition of Done)

```typescript
interface IDoDDocument {
  content: {
    criteria: {
      id: string;        // Уникальный ID критерия
      description: string; // Описание критерия
      checkMethod: string; // Метод проверки
      phaseId: string;   // ID фазы, к которой относится критерий
    }[]
  }
}
```

## Заключение

Документооборот в Escrow Library предоставляет полный цикл работы с документами проекта, от начального планирования до сдачи и приемки результатов, с использованием AI для автоматизации рутинных задач и обеспечения качества. 