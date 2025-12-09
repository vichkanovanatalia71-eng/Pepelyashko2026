# 📋 ДОВІДНИК ЗМІННИХ ДЛЯ ШАБЛОНУ АКТУ

> **Останнє оновлення:** 09.12.2025  
> **Файл шаблону:** `/app/backend/act_template.html`  
> **Сервіс генерації:** `/app/backend/services/act_pdf_service.py`

---

## 📄 **1. ІНФОРМАЦІЯ ПРО АКТ**

| Змінна | Тип | Опис | Приклад |
|--------|-----|------|---------|
| `act_number` | string | Номер акту | "1968-1" |
| `act_date` | string | Дата акту у форматі українською | "09 грудня 2025 року" |
| `city` | string | Місто складання документу (з адреси постачальника) | "м. Одеса" |
| `basis` | string | Підстава для складання акту | "Замовлення №123" |
| `based_on_order` | string/null | Номер замовлення-основи | "ORD-2024-001" |
| `based_on_document` | string/null | Номер договору-основи | "Договір №45/2024" |

**Використання в шаблоні:**
```handlebars
<h1>Акт №{{act_number}}</h1>
<p>від {{act_date}}</p>
<p>Місто: {{city}}</p>

{{#if based_on_order}}
<p>На підставі замовлення: {{based_on_order}}</p>
{{/if}}

{{#if based_on_document}}
<p>Згідно з {{based_on_document}}</p>
{{/if}}
```

---

## 🏢 **2. ПОСТАЧАЛЬНИК (ВИКОНАВЕЦЬ)**

| Змінна | Тип | Опис | Приклад |
|--------|-----|------|---------|
| `supplier_name` | string | Повна назва компанії | "ТОВ ВОРДКРАФТ" |
| `supplier_edrpou` | string | ЄДРПОУ код (8 цифр) | "12345678" |
| `supplier_address` | string | Юридична адреса | "м. Київ, вул. Хрещатик, 1" |
| `supplier_iban` | string | IBAN рахунок (29 символів) | "UA123456789012345678901234567" |
| `supplier_bank` | string | Назва банку | "АТ "ПриватБанк"" |
| `supplier_mfo` | string | МФО банку (6 цифр) | "305299" |
| `supplier_email` | string | Email адреса | "info@company.com" |
| `supplier_phone` | string | Телефон | "+380501234567" |
| `supplier_representative` | string | **В особі** представника | "директора Колонтая Р.Л., що діє на підставі Статуту" |
| `supplier_signature` | string | Місце для підпису | "Колонтай Р.Л." |
| `supplier_logo` | string/null | Логотип у форматі base64 | "data:image/png;base64,iVBORw0KGg..." |

**Використання в шаблоні:**
```handlebars
<div class="supplier-info">
  {{#if supplier_logo}}
  <img src="{{supplier_logo}}" alt="Логотип" class="logo" />
  {{/if}}
  
  <p><strong>Виконавець:</strong> {{supplier_name}}</p>
  <p><strong>ЄДРПОУ:</strong> {{supplier_edrpou}}</p>
  <p><strong>В особі:</strong> {{supplier_representative}}</p>
  <p><strong>Підпис:</strong> _____________ / {{supplier_signature}} /</p>
</div>
```

---

## 🏪 **3. ПОКУПЕЦЬ (ЗАМОВНИК)**

| Змінна | Тип | Опис | Приклад |
|--------|-----|------|---------|
| `buyer_name` | string | Повна назва компанії | "КНП БАЛТСЬКИЙ ЦПМСД" |
| `buyer_edrpou` | string | ЄДРПОУ код (8 цифр) | "87654321" |
| `buyer_address` | string | Юридична адреса | "Одеська обл., м. Балта, вул. Центральна, 5" |
| `buyer_iban` | string | IBAN рахунок | "UA987654321098765432109876543" |
| `buyer_bank` | string | Назва банку | "АТ "Ощадбанк"" |
| `buyer_mfo` | string | МФО банку | "305299" |
| `buyer_email` | string | Email адреса | "buyer@example.com" |
| `buyer_phone` | string | Телефон | "+380671234567" |
| `buyer_representative` | string | **В особі** представника | "директора Чорного С.І., що діє на підставі Статуту" |
| `buyer_position` | string | Посада представника | "Директор" |
| `buyer_signature` | string | Місце для підпису | "Чорний С.І." |

**Використання в шаблоні:**
```handlebars
<div class="buyer-info">
  <p><strong>Замовник:</strong> {{buyer_name}}</p>
  <p><strong>ЄДРПОУ:</strong> {{buyer_edrpou}}</p>
  <p><strong>В особі:</strong> {{buyer_representative}}</p>
  
  {{#if buyer_position}}
  <p><strong>Посада:</strong> {{buyer_position}}</p>
  {{/if}}
  
  <p><strong>Підпис:</strong> _____________ / {{buyer_signature}} /</p>
</div>
```

---

## 📦 **4. ПОЗИЦІЇ (ТОВАРИ/ПОСЛУГИ)**

| Змінна | Тип | Опис |
|--------|-----|------|
| `items` | array | Масив об'єктів з позиціями акту |

**Структура кожної позиції:**

| Поле | Тип | Опис | Приклад |
|------|-----|------|---------|
| `name` | string | Найменування товару/послуги | "Консультаційні послуги" |
| `unit` | string | Одиниця виміру | "послуга", "шт", "кг", "м" |
| `qty` | string | Кількість (відформатована) | "1.00" |
| `price` | string | Ціна за одиницю | "5 000.00" |
| `sum` | string | Сума по позиції | "5 000.00" |

**Використання в шаблоні:**
```handlebars
<table class="items-table">
  <thead>
    <tr>
      <th>№</th>
      <th>Найменування</th>
      <th>Од. вим.</th>
      <th>Кількість</th>
      <th>Ціна</th>
      <th>Сума</th>
    </tr>
  </thead>
  <tbody>
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
  </tbody>
</table>
```

> **Примітка:** Helper `{{inc @index}}` використовується для нумерації рядків з 1 (а не з 0).

---

## 💰 **5. СУМИ ТА ПДВ**

| Змінна | Тип | Опис | Приклад |
|--------|-----|------|---------|
| `total_amount` | string | Загальна сума акту (відформатована) | "25 000.00" |
| `amount_without_vat` | string | Сума без ПДВ | "20 833.33" |
| `vat_amount` | string | Сума ПДВ | "4 166.67" |
| `vat_rate` | string | Ставка ПДВ (%) | "20" |
| `total_amount_text` | string | Сума прописом українською | "двадцять п'ять тисяч гривень 00 копійок" |
| `is_vat_payer` | boolean | Чи є компанія платником ПДВ | true / false |

**Використання в шаблоні:**
```handlebars
<div class="totals">
  {{#if is_vat_payer}}
  <p>Сума без ПДВ: {{amount_without_vat}} грн</p>
  <p>ПДВ ({{vat_rate}}%): {{vat_amount}} грн</p>
  {{/if}}
  
  <p class="total"><strong>Всього до сплати: {{total_amount}} грн</strong></p>
  <p class="total-text">{{total_amount_text}}</p>
</div>
```

---

## 🎨 **6. СПЕЦІАЛЬНІ HELPERS**

### `inc` - Інкремент індексу
```handlebars
{{#each items}}
  <td>{{inc @index}}</td>  <!-- Виведе 1, 2, 3... замість 0, 1, 2... -->
{{/each}}
```

---

## 📝 **7. ПОВНИЙ ПРИКЛАД ВИКОРИСТАННЯ**

```handlebars
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Акт №{{act_number}}</title>
</head>
<body>
  <!-- Шапка з логотипом -->
  {{#if supplier_logo}}
  <div class="header">
    <img src="{{supplier_logo}}" alt="Логотип" class="company-logo" />
  </div>
  {{/if}}
  
  <!-- Назва документу -->
  <h1>Акт прийнятих робіт №{{act_number}}</h1>
  <p>від {{act_date}}</p>
  
  <!-- Підстава -->
  {{#if based_on_order}}
  <p>На підставі: {{based_on_order}}</p>
  {{/if}}
  
  <!-- Таблиця позицій -->
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Найменування</th>
        <th>Од.</th>
        <th>К-ть</th>
        <th>Ціна</th>
        <th>Сума</th>
      </tr>
    </thead>
    <tbody>
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
    </tbody>
  </table>
  
  <!-- Підсумки -->
  <div class="totals">
    {{#if is_vat_payer}}
    <p>Без ПДВ: {{amount_without_vat}} грн</p>
    <p>ПДВ ({{vat_rate}}%): {{vat_amount}} грн</p>
    {{/if}}
    <p><strong>Всього: {{total_amount}} грн</strong></p>
    <p>{{total_amount_text}}</p>
  </div>
  
  <!-- Підписи сторін -->
  <table class="signatures">
    <tr>
      <td>
        <h3>ЗАМОВНИК</h3>
        <p>{{buyer_name}}</p>
        <p>ЄДРПОУ: {{buyer_edrpou}}</p>
        <p>В особі: {{buyer_representative}}</p>
        <p>Підпис: _______ / {{buyer_signature}} /</p>
      </td>
      <td>
        <h3>ВИКОНАВЕЦЬ</h3>
        <p>{{supplier_name}}</p>
        <p>ЄДРПОУ: {{supplier_edrpou}}</p>
        <p>В особі: {{supplier_representative}}</p>
        <p>Підпис: _______ / {{supplier_signature}} /</p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 📊 **СТАТИСТИКА**

- **Всього змінних:** 34
- **Інформація про акт:** 5 змінних
- **Постачальник:** 11 змінних
- **Покупець:** 11 змінних
- **Позиції:** 1 масив (5 полів на елемент)
- **Суми та ПДВ:** 5 змінних
- **Helpers:** 1 (inc)

---

## ⚠️ **ВАЖЛИВІ ПРИМІТКИ**

1. **Форматування чисел:**  
   Всі числові значення (`qty`, `price`, `sum`, `total_amount`, тощо) вже відформатовані з пробілами як розділювачами тисяч. Не потрібно додатково форматувати.

2. **Поля "В особі":**  
   `supplier_representative` та `buyer_representative` - це нові поля, додані 09.12.2025. Вони містять повну інформацію про представників компаній.

3. **Логотип компанії:**  
   `supplier_logo` передається як base64 string у форматі `data:image/png;base64,...`. Можна використовувати безпосередньо в `<img src="">`.

4. **Умовні блоки:**  
   Використовуйте `{{#if variable}}...{{/if}}` для відображення опціональних полів.

5. **ПДВ розрахунок:**  
   Система автоматично розраховує ПДВ якщо `is_vat_payer = true`. За замовчуванням ставка 20%.

6. **Дата:**  
   `act_date` вже відформатована українською мовою у вигляді "09 грудня 2025 року". Не потрібно додатково форматувати.

---

**Для питань щодо використання змінних:**
- Файл сервісу: `/app/backend/services/act_pdf_service.py`
- Файл шаблону: `/app/backend/act_template.html`
- Документація Handlebars: https://handlebarsjs.com/

---

_Цей документ створено автоматично 09.12.2025_
