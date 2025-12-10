# 📋 ДОВІДНИК ЗМІННИХ ДЛЯ ШАБЛОНУ НАКЛАДНОЇ

## 📄 ІНФОРМАЦІЯ ПРО ДОКУМЕНТ

### Номер документа
- `{{waybill_number}}` - Номер накладної (наприклад: "1968-1")
- `{{document_number}}` - Аліас для номера документа

### Дати (різні формати)
- `{{waybill_date}}` - Дата у форматі ДД.ММ.РРРР (09.12.2025)
- `{{waybill_date_short}}` - Коротка дата ДД.ММ.РР (09.12.25)
- `{{waybill_date_long}}` - Довга дата (09 December 2025)
- `{{waybill_date_iso}}` - ISO формат (2025-12-09)
- `{{waybill_date_text}}` - Дата текстом українською (9 грудня 2025 р.)
- `{{waybill_date_text_full}}` - Повна дата текстом (09 грудня 2025 року)
- `{{document_date}}` - Аліас для дати
- `{{document_date_text}}` - Аліас для дати текстом

### Місце та підстава
- `{{city}}` - Місто складання документа (м. Київ)
- `{{basis}}` - Підстава для накладної
- `{{based_on_order}}` - На основі замовлення №
- `{{based_on_document}}` - Згідно з документом
- `{{based_on_contract}}` - На основі договору

---

## 💰 ФІНАНСОВІ ДАНІ

### Суми (числові)
- `{{total_amount}}` - Загальна сума (150000.00)
- `{{amount_without_vat}}` - Сума без ПДВ (125000.00)
- `{{vat_amount}}` - Сума ПДВ (25000.00)
- `{{vat_rate}}` - Ставка ПДВ (20)

### Суми прописом (текстом)
- `{{total_amount_text}}` - Загальна сума прописом
- `{{total_amount_words}}` - Аліас для суми прописом
- `{{amount_in_words}}` - Аліас для суми прописом
- `{{amount_without_vat_text}}` - Сума без ПДВ прописом
- `{{vat_amount_text}}` - Сума ПДВ прописом

### ПДВ інформація
- `{{is_vat_payer}}` - Чи є платником ПДВ (true/false)
- `{{vat_note}}` - Примітка про ПДВ ("У тому числі ПДВ 20%: 25000.00 грн")

---

## 📦 ПОЗИЦІЇ ТОВАРІВ/ПОСЛУГ

### Масив items
Кожна позиція має наступні поля:
- `{{name}}` - Найменування товару/послуги
- `{{unit}}` - Одиниця виміру (шт, кг, м, год)
- `{{qty}}` / `{{quantity}}` - Кількість
- `{{price}}` - Ціна за одиницю
- `{{sum}}` / `{{amount}}` - Сума (кількість × ціна)

### Приклад використання в циклі:
```handlebars
{{#each items}}
  <tr>
    <td>{{inc @index}}</td>
    <td>{{this.name}}</td>
    <td>{{this.unit}}</td>
    <td>{{this.qty}}</td>
    <td>{{this.price}}</td>
    <td>{{this.sum}}</td>
  </tr>
{{/each}}
```

### Готова HTML таблиця
- `{{items_table}}` - Готова HTML таблиця з усіма позиціями

---

## 🏢 ІНФОРМАЦІЯ ПРО ПОСТАЧАЛЬНИКА

### Основні дані
- `{{supplier_name}}` - Повна назва компанії
- `{{supplier_company_name}}` - Аліас для назви
- `{{supplier_edrpou}}` - Код ЄДРПОУ (8 або 10 цифр)
- `{{supplier_code}}` - Аліас для ЄДРПОУ

### Адреси та контакти
- `{{supplier_address}}` - Юридична адреса
- `{{supplier_legal_address}}` - Аліас для адреси
- `{{supplier_email}}` - Електронна пошта
- `{{supplier_phone}}` - Телефон

### Банківські реквізити
- `{{supplier_iban}}` - IBAN рахунок
- `{{supplier_bank_account}}` - Аліас для IBAN
- `{{supplier_mfo}}` - МФО банку
- `{{supplier_bank}}` - Назва банку
- `{{supplier_bank_name}}` - Аліас для назви банку

### Представники та підписи
- `{{supplier_representative}}` - В особі (ПІБ директора)
- `{{supplier_represented_by}}` - Аліас
- `{{supplier_position}}` - Посада (Директор, Генеральний директор)
- `{{supplier_signature}}` - Підпис (ПІБ для підпису)

### Логотип
- `{{supplier_logo}}` - Шлях до файлу логотипу
- `{{supplier_logo_url}}` - Аліас для логотипу

---

## 🤝 ІНФОРМАЦІЯ ПРО ПОКУПЦЯ (ОДЕРЖУВАЧА)

### Основні дані
- `{{buyer_name}}` - Повна назва компанії
- `{{buyer_company_name}}` - Аліас для назви
- `{{counterparty_name}}` - Аліас для назви контрагента
- `{{buyer_edrpou}}` - Код ЄДРПОУ
- `{{buyer_code}}` - Аліас для ЄДРПОУ
- `{{counterparty_edrpou}}` - Аліас для ЄДРПОУ контрагента

### Адреси та контакти
- `{{buyer_address}}` - Юридична адреса
- `{{buyer_legal_address}}` - Аліас для адреси
- `{{buyer_email}}` - Електронна пошта
- `{{buyer_phone}}` - Телефон

### Банківські реквізити
- `{{buyer_iban}}` - IBAN рахунок
- `{{buyer_bank_account}}` - Аліас для IBAN
- `{{buyer_mfo}}` - МФО банку
- `{{buyer_bank}}` - Назва банку
- `{{buyer_bank_name}}` - Аліас для назви банку

### Представники та підписи
- `{{buyer_representative}}` - В особі (ПІБ директора)
- `{{buyer_represented_by}}` - Аліас
- `{{buyer_position}}` - Посада
- `{{buyer_signature}}` - Підпис (ПІБ для підпису)

---

## 🔧 ДОПОМІЖНІ ФУНКЦІЇ

### `inc` - Інкремент індексу
Використовується для нумерації позицій (починаючи з 1):
```handlebars
{{inc @index}}
```

### `#if` - Умовний оператор
Показати блок тільки якщо змінна існує:
```handlebars
{{#if supplier_logo}}
  <img src="{{supplier_logo}}" alt="Логотип">
{{/if}}
```

### `#each` - Цикл
Перебір масиву items:
```handlebars
{{#each items}}
  <p>{{this.name}}: {{this.sum}} грн</p>
{{/each}}
```

---

## 📊 ПРИКЛАД ПОВНОГО ВИКОРИСТАННЯ

```html
<!DOCTYPE html>
<html>
<head>
    <title>Видаткова накладна №{{waybill_number}}</title>
</head>
<body>
    {{#if supplier_logo}}
    <img src="{{supplier_logo}}" alt="Логотип">
    {{/if}}
    
    <h1>Видаткова накладна №{{waybill_number}}</h1>
    <p>від {{waybill_date}} ({{waybill_date_text}})</p>
    <p>{{city}}</p>
    
    {{#if based_on_order}}
    <p>На підставі замовлення №{{based_on_order}}</p>
    {{/if}}
    
    <h2>Постачальник</h2>
    <p>{{supplier_name}}</p>
    <p>ЄДРПОУ: {{supplier_edrpou}}</p>
    <p>Адреса: {{supplier_address}}</p>
    <p>В особі: {{supplier_representative}}</p>
    
    <h2>Покупець (Одержувач)</h2>
    <p>{{buyer_name}}</p>
    <p>ЄДРПОУ: {{buyer_edrpou}}</p>
    <p>Адреса: {{buyer_address}}</p>
    
    <h2>Товари та послуги</h2>
    <table>
        <tr>
            <th>№</th>
            <th>Найменування</th>
            <th>Од.</th>
            <th>Кількість</th>
            <th>Ціна</th>
            <th>Сума</th>
        </tr>
        {{#each items}}
        <tr>
            <td>{{inc @index}}</td>
            <td>{{this.name}}</td>
            <td>{{this.unit}}</td>
            <td>{{this.qty}}</td>
            <td>{{this.price}}</td>
            <td>{{this.sum}}</td>
        </tr>
        {{/each}}
    </table>
    
    <p>Всього до сплати: {{total_amount}} грн</p>
    <p>{{total_amount_text}}</p>
    
    {{#if is_vat_payer}}
    <p>Сума без ПДВ: {{amount_without_vat}} грн</p>
    <p>ПДВ ({{vat_rate}}%): {{vat_amount}} грн</p>
    {{/if}}
    
    <div class="signatures">
        <div>
            <p>Відпустив: {{supplier_position}}</p>
            <p>_________________ {{supplier_signature}}</p>
        </div>
        <div>
            <p>Одержав: {{buyer_position}}</p>
            <p>_________________ {{buyer_signature}}</p>
        </div>
    </div>
</body>
</html>
```

---

## 📝 ЗАГАЛЬНА КІЛЬКІСТЬ ЗМІННИХ: 80+

### Категорії:
- ✅ Документ: 15 змінних
- ✅ Фінанси: 12 змінних
- ✅ Позиції: 6 полів × N позицій
- ✅ Постачальник: 17 змінних
- ✅ Покупець: 17 змінних
- ✅ Допоміжні: 3 функції

---

_Документ створено автоматично 10.12.2025_
