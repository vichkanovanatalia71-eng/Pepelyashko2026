import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Code, FileText, FileText as InvoiceIcon, FileCheck, Truck, FileSignature } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TemplateEditor = () => {
  const [templates, setTemplates] = useState({});
  const [selectedType, setSelectedType] = useState('invoice');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showVariables, setShowVariables] = useState(true);

  const templateTypes = [
    { key: 'invoice', label: 'Рахунок', icon: InvoiceIcon },
    { key: 'act', label: 'Акт', icon: FileCheck },
    { key: 'waybill', label: 'Накладна', icon: Truck },
    { key: 'contract', label: 'Договір', icon: FileSignature },
  ];

  // Available variables for each template type
  const templateVariables = {
    invoice: [
      { var: '{{document_number}}', desc: 'Номер рахунку' },
      { var: '{{document_date_text}}', desc: 'Дата рахунку (текстом)' },
      { var: '{{document_date_text_full}}', desc: 'Дата текстом (09 грудня 2025 року)' },
      { var: '{{city}}', desc: 'Місто складання документу' },
      { var: '{{supplier_logo}}', desc: 'Логотип постачальника (використовувати в {{#if}}...{{/if}})' },
      { var: '{{supplier_name}}', desc: 'Назва постачальника' },
      { var: '{{supplier_edrpou}}', desc: 'ЄДРПОУ постачальника' },
      { var: '{{supplier_address}}', desc: 'Адреса постачальника' },
      { var: '{{supplier_bank}}', desc: 'Банк постачальника' },
      { var: '{{supplier_iban}}', desc: 'IBAN постачальника' },
      { var: '{{supplier_mfo}}', desc: 'МФО банку постачальника' },
      { var: '{{supplier_signature}}', desc: 'Підпис постачальника' },
      { var: '{{buyer_name}}', desc: 'Назва покупця' },
      { var: '{{buyer_edrpou}}', desc: 'ЄДРПОУ покупця' },
      { var: '{{buyer_address}}', desc: 'Адреса покупця' },
      { var: '{{buyer_bank}}', desc: 'Банк покупця' },
      { var: '{{buyer_iban}}', desc: 'IBAN покупця' },
      { var: '{{buyer_mfo}}', desc: 'МФО банку покупця' },
      { var: '{{buyer_position}}', desc: 'Посада представника покупця' },
      { var: '{{items_table}}', desc: 'Таблиця товарів/послуг (автоматично згенерована)' },
      { var: '{{total_amount}}', desc: 'Загальна сума' },
      { var: '{{amount_without_vat}}', desc: 'Сума без ПДВ' },
      { var: '{{vat_rate}}', desc: 'Ставка ПДВ (%)' },
      { var: '{{vat_amount}}', desc: 'Сума ПДВ' },
      { var: '{{total_amount_text}}', desc: 'Сума прописом' },
      { var: '{{based_on_order}}', desc: 'Номер замовлення (основа)' },
      { var: '{{based_on_document}}', desc: 'Номер документу (основа)' },
      { var: '{{#if is_vat_payer}}...{{else}}...{{/if}}', desc: 'Умова: чи є платником ПДВ' },
      { var: '{{#if supplier_logo}}...{{/if}}', desc: 'Умова: чи є логотип' },
      { var: '{{#if based_on_order}}...{{/if}}', desc: 'Умова: чи є базове замовлення' },
    ],
    act: [
      { var: '{{act_number}}', desc: 'Номер акта' },
      { var: '{{act_date}}', desc: 'Дата акта' },
      { var: '{{act_date_text_full}}', desc: 'Дата текстом (09 грудня 2025 року)' },
      { var: '{{city}}', desc: 'Місто складання документу' },
      { var: '{{basis}}', desc: 'Підстава складання акта' },
      { var: '{{supplier_logo}}', desc: 'Логотип постачальника (використовувати в {{#if}}...{{/if}})' },
      { var: '{{supplier_name}}', desc: 'Назва виконавця' },
      { var: '{{supplier_edrpou}}', desc: 'ЄДРПОУ виконавця' },
      { var: '{{supplier_address}}', desc: 'Адреса виконавця' },
      { var: '{{supplier_bank}}', desc: 'Банк виконавця' },
      { var: '{{supplier_iban}}', desc: 'IBAN виконавця' },
      { var: '{{supplier_mfo}}', desc: 'МФО банку виконавця' },
      { var: '{{supplier_email}}', desc: 'Email виконавця' },
      { var: '{{supplier_phone}}', desc: 'Телефон виконавця' },
      { var: '{{supplier_representative}}', desc: 'Представник виконавця' },
      { var: '{{supplier_signature}}', desc: 'Підпис виконавця' },
      { var: '{{buyer_name}}', desc: 'Назва замовника' },
      { var: '{{buyer_edrpou}}', desc: 'ЄДРПОУ замовника' },
      { var: '{{buyer_address}}', desc: 'Адреса замовника' },
      { var: '{{buyer_bank}}', desc: 'Банк замовника' },
      { var: '{{buyer_iban}}', desc: 'IBAN замовника' },
      { var: '{{buyer_mfo}}', desc: 'МФО банку замовника' },
      { var: '{{buyer_email}}', desc: 'Email замовника' },
      { var: '{{buyer_phone}}', desc: 'Телефон замовника' },
      { var: '{{buyer_representative}}', desc: 'Представник замовника' },
      { var: '{{buyer_signature}}', desc: 'Підпис замовника' },
      { var: '{{buyer_position}}', desc: 'Посада представника замовника' },
      { var: '{{#each items}}...{{/each}}', desc: 'Цикл по товарах/послугах' },
      { var: '{{this.name}}', desc: 'Назва товару/послуги (в циклі)' },
      { var: '{{this.unit}}', desc: 'Одиниця виміру (в циклі)' },
      { var: '{{this.qty}}', desc: 'Кількість (в циклі)' },
      { var: '{{this.price}}', desc: 'Ціна (в циклі)' },
      { var: '{{this.sum}}', desc: 'Сума (в циклі)' },
      { var: '{{inc @index}}', desc: 'Номер рядка (індекс + 1)' },
      { var: '{{total_amount}}', desc: 'Загальна сума' },
      { var: '{{amount_without_vat}}', desc: 'Сума без ПДВ' },
      { var: '{{vat_rate}}', desc: 'Ставка ПДВ (%)' },
      { var: '{{vat_amount}}', desc: 'Сума ПДВ' },
      { var: '{{total_amount_text}}', desc: 'Сума прописом' },
      { var: '{{based_on_order}}', desc: 'Номер замовлення (основа)' },
      { var: '{{based_on_document}}', desc: 'Номер документу (основа)' },
      { var: '{{#if is_vat_payer}}...{{else}}...{{/if}}', desc: 'Умова: чи є платником ПДВ' },
      { var: '{{#if supplier_logo}}...{{/if}}', desc: 'Умова: чи є логотип' },
      { var: '{{#if based_on_order}}...{{/if}}', desc: 'Умова: чи є базове замовлення' },
      { var: '{{#if buyer_position}}...{{/if}}', desc: 'Умова: чи є посада покупця' },
    ],
    waybill: [
      // Документ (номери та дати)
      { var: '{{waybill_number}}', desc: 'Номер накладної (наприклад: "1968-1")' },
      { var: '{{document_number}}', desc: 'Аліас для номера документа' },
      { var: '{{waybill_date}}', desc: 'Дата у форматі ДД.ММ.РРРР (09.12.2025)' },
      { var: '{{waybill_date_short}}', desc: 'Коротка дата ДД.ММ.РР (09.12.25)' },
      { var: '{{waybill_date_long}}', desc: 'Довга дата (09 December 2025)' },
      { var: '{{waybill_date_iso}}', desc: 'ISO формат (2025-12-09)' },
      { var: '{{waybill_date_text}}', desc: 'Дата текстом українською (9 грудня 2025 р.)' },
      { var: '{{waybill_date_text_full}}', desc: 'Повна дата текстом (09 грудня 2025 року)' },
      { var: '{{document_date}}', desc: 'Аліас для дати' },
      { var: '{{document_date_text}}', desc: 'Аліас для дати текстом' },
      { var: '{{city}}', desc: 'Місто складання документа (м. Київ)' },
      { var: '{{basis}}', desc: 'Підстава для накладної' },
      { var: '{{based_on_order}}', desc: 'На основі замовлення №' },
      { var: '{{based_on_document}}', desc: 'Згідно з документом' },
      { var: '{{based_on_contract}}', desc: 'На основі договору' },
      
      // Фінанси (числові значення)
      { var: '{{total_amount}}', desc: 'Загальна сума (150000.00)' },
      { var: '{{amount_without_vat}}', desc: 'Сума без ПДВ (125000.00)' },
      { var: '{{vat_amount}}', desc: 'Сума ПДВ (25000.00)' },
      { var: '{{vat_rate}}', desc: 'Ставка ПДВ (20)' },
      { var: '{{total_amount_text}}', desc: 'Загальна сума прописом' },
      { var: '{{total_amount_words}}', desc: 'Аліас для суми прописом' },
      { var: '{{amount_in_words}}', desc: 'Аліас для суми прописом' },
      { var: '{{amount_without_vat_text}}', desc: 'Сума без ПДВ прописом' },
      { var: '{{vat_amount_text}}', desc: 'Сума ПДВ прописом' },
      { var: '{{is_vat_payer}}', desc: 'Чи є платником ПДВ (true/false)' },
      { var: '{{vat_note}}', desc: 'Примітка про ПДВ ("У тому числі ПДВ 20%: 25000.00 грн")' },
      
      // Позиції товарів/послуг
      { var: '{{items_table}}', desc: 'Готова HTML таблиця з усіма позиціями' },
      { var: '{{#each items}}...{{/each}}', desc: 'Цикл по товарах/послугах' },
      { var: '{{this.name}}', desc: 'Найменування товару/послуги (в циклі)' },
      { var: '{{this.unit}}', desc: 'Одиниця виміру - шт, кг, м, год (в циклі)' },
      { var: '{{this.qty}}', desc: 'Кількість (в циклі)' },
      { var: '{{this.quantity}}', desc: 'Аліас для кількості (в циклі)' },
      { var: '{{this.price}}', desc: 'Ціна за одиницю (в циклі)' },
      { var: '{{this.sum}}', desc: 'Сума (кількість × ціна) (в циклі)' },
      { var: '{{this.amount}}', desc: 'Аліас для суми (в циклі)' },
      { var: '{{inc @index}}', desc: 'Номер рядка (індекс + 1)' },
      
      // Постачальник - основні дані
      { var: '{{supplier_name}}', desc: 'Повна назва компанії постачальника' },
      { var: '{{supplier_company_name}}', desc: 'Аліас для назви' },
      { var: '{{supplier_edrpou}}', desc: 'Код ЄДРПОУ постачальника (8 або 10 цифр)' },
      { var: '{{supplier_code}}', desc: 'Аліас для ЄДРПОУ' },
      
      // Постачальник - адреси та контакти
      { var: '{{supplier_address}}', desc: 'Юридична адреса постачальника' },
      { var: '{{supplier_legal_address}}', desc: 'Аліас для адреси' },
      { var: '{{supplier_email}}', desc: 'Електронна пошта постачальника' },
      { var: '{{supplier_phone}}', desc: 'Телефон постачальника' },
      
      // Постачальник - банківські реквізити
      { var: '{{supplier_iban}}', desc: 'IBAN рахунок постачальника' },
      { var: '{{supplier_bank_account}}', desc: 'Аліас для IBAN' },
      { var: '{{supplier_mfo}}', desc: 'МФО банку постачальника' },
      { var: '{{supplier_bank}}', desc: 'Назва банку постачальника' },
      { var: '{{supplier_bank_name}}', desc: 'Аліас для назви банку' },
      
      // Постачальник - представники та підписи
      { var: '{{supplier_representative}}', desc: 'В особі (ПІБ директора)' },
      { var: '{{supplier_represented_by}}', desc: 'Аліас' },
      { var: '{{supplier_position}}', desc: 'Посада (Директор, Генеральний директор)' },
      { var: '{{supplier_signature}}', desc: 'Підпис (ПІБ для підпису)' },
      { var: '{{supplier_logo}}', desc: 'Шлях до файлу логотипу (використовувати в {{#if}}...{{/if}})' },
      { var: '{{supplier_logo_url}}', desc: 'Аліас для логотипу' },
      
      // Покупець (одержувач) - основні дані
      { var: '{{buyer_name}}', desc: 'Повна назва компанії покупця' },
      { var: '{{buyer_company_name}}', desc: 'Аліас для назви' },
      { var: '{{counterparty_name}}', desc: 'Аліас для назви контрагента' },
      { var: '{{buyer_edrpou}}', desc: 'Код ЄДРПОУ покупця' },
      { var: '{{buyer_code}}', desc: 'Аліас для ЄДРПОУ' },
      { var: '{{counterparty_edrpou}}', desc: 'Аліас для ЄДРПОУ контрагента' },
      
      // Покупець - адреси та контакти
      { var: '{{buyer_address}}', desc: 'Юридична адреса покупця' },
      { var: '{{buyer_legal_address}}', desc: 'Аліас для адреси' },
      { var: '{{buyer_email}}', desc: 'Електронна пошта покупця' },
      { var: '{{buyer_phone}}', desc: 'Телефон покупця' },
      
      // Покупець - банківські реквізити
      { var: '{{buyer_iban}}', desc: 'IBAN рахунок покупця' },
      { var: '{{buyer_bank_account}}', desc: 'Аліас для IBAN' },
      { var: '{{buyer_mfo}}', desc: 'МФО банку покупця' },
      { var: '{{buyer_bank}}', desc: 'Назва банку покупця' },
      { var: '{{buyer_bank_name}}', desc: 'Аліас для назви банку' },
      
      // Покупець - представники та підписи
      { var: '{{buyer_representative}}', desc: 'В особі (ПІБ директора)' },
      { var: '{{buyer_represented_by}}', desc: 'Аліас' },
      { var: '{{buyer_position}}', desc: 'Посада' },
      { var: '{{buyer_signature}}', desc: 'Підпис (ПІБ для підпису)' },
      
      // Умовні оператори
      { var: '{{#if supplier_logo}}...{{/if}}', desc: 'Умова: чи є логотип' },
      { var: '{{#if is_vat_payer}}...{{else}}...{{/if}}', desc: 'Умова: чи є платником ПДВ' },
      { var: '{{#if based_on_order}}...{{/if}}', desc: 'Умова: чи є базове замовлення' },
    ],
    contract: [
      { var: '{{contract_number}}', desc: 'Номер договору' },
      { var: '{{contract_date}}', desc: 'Дата договору' },
      { var: '{{supplier_name}}', desc: 'Назва сторони 1' },
      { var: '{{buyer_name}}', desc: 'Назва сторони 2' },
    ],
  };

  useEffect(() => {
    loadAllTemplates();
  }, []);

  const loadAllTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Group templates by type
      const grouped = {};
      response.data.forEach(template => {
        if (template.user_id || template.is_default) {
          // Store user templates, or system defaults if no user template exists
          if (!grouped[template.template_type] || template.user_id) {
            grouped[template.template_type] = template;
          }
        }
      });
      
      setTemplates(grouped);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Помилка завантаження шаблонів');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTemplate = () => {
    return templates[selectedType] || null;
  };

  const handleEdit = () => {
    const currentTemplate = getCurrentTemplate();
    if (currentTemplate) {
      setIsEditing(true);
      setEditedContent(currentTemplate.content);
      setViewMode('code');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveTemplate = async () => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate || !editedContent.trim()) {
      toast.error('Шаблон не може бути порожнім');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/templates/${currentTemplate._id}`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно оновлено!');
      setIsEditing(false);
      
      await loadAllTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження шаблону');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    const currentTemplate = getCurrentTemplate();
    
    // Завжди показуємо підтвердження, якщо є який-небудь шаблон
    if (currentTemplate && currentTemplate.user_id) {
      if (!window.confirm('Ви впевнені, що хочете скинути шаблон на системний за замовчуванням? Всі ваші зміни будуть втрачені.')) {
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // ЗАВЖДИ завантажуємо системний шаблон
      const response = await axios.get(
        `${API_URL}/api/templates/system/${selectedType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('System template loaded:', {
        id: response.data._id,
        size: response.data.content.length,
        first100: response.data.content.substring(0, 100)
      });
      
      // Якщо є користувацький шаблон, видаляємо його або скидаємо
      if (currentTemplate && currentTemplate.user_id) {
        try {
          // Намагаємось скинути через reset endpoint
          await axios.post(
            `${API_URL}/api/templates/${currentTemplate._id}/reset`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('User template reset to system');
        } catch (resetError) {
          console.log('Reset endpoint not available or failed, loading system template directly');
        }
      }
      
      // ПРИМУСОВО оновлюємо стан з системним шаблоном
      setTemplates(prev => {
        const newTemplates = {
          ...prev,
          [selectedType]: response.data
        };
        console.log('Templates FORCE updated, new template for', selectedType, ':', {
          id: newTemplates[selectedType]._id,
          size: newTemplates[selectedType].content.length
        });
        return newTemplates;
      });
      
      toast.success('Системний шаблон завантажено!');
      setIsEditing(false);
      setEditedContent(''); // Очищаємо відредагований контент
      setViewMode('code'); // Показуємо HTML код
      
      // Перезавантажуємо всі шаблони для синхронізації
      await loadAllTemplates();
    } catch (error) {
      console.error('Error loading system template:', error);
      toast.error(error.response?.data?.detail || 'Помилка завантаження системного шаблону');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateTypeLabel = (type) => {
    const typeObj = templateTypes.find(t => t.key === type);
    return typeObj ? typeObj.label : type;
  };

  const currentTemplate = getCurrentTemplate();

  if (loading && Object.keys(templates).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Завантаження шаблонів...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Шаблони документів</CardTitle>
          <CardDescription>
            Редагуйте HTML-код шаблонів для налаштування вигляду PDF документів
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={(value) => {
            setSelectedType(value);
            setIsEditing(false);
            setViewMode('preview');
          }}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {templateTypes.map(type => {
                const Icon = type.icon;
                return (
                  <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {templateTypes.map(type => (
              <TabsContent key={type.key} value={type.key} className="space-y-4">
                {currentTemplate ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{getTemplateTypeLabel(selectedType)}</h3>
                        <p className="text-sm text-gray-500">
                          Редагуйте HTML-код шаблону для налаштування PDF
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <>
                            <Button
                              variant={viewMode === 'preview' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setViewMode('preview')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Попередній перегляд
                            </Button>
                            <Button
                              variant={viewMode === 'code' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setViewMode('code')}
                            >
                              <Code className="w-4 h-4 mr-2" />
                              HTML код
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetToDefault}
                              disabled={loading}
                              className="border-purple-500 text-purple-600 hover:bg-purple-50"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Системний шаблон
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleEdit}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редагувати
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={loading}
                            >
                              Скасувати
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleSaveTemplate}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {loading ? 'Збереження...' : 'Зберегти'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                      {/* Main content area */}
                      <div className={showVariables ? 'col-span-8' : 'col-span-12'}>
                        {viewMode === 'preview' && !isEditing ? (
                          <div className="border rounded-lg p-4 bg-white">
                            <iframe
                              srcDoc={currentTemplate.content}
                              className="w-full h-[600px] border-0"
                              title="Template Preview"
                            />
                          </div>
                        ) : isEditing ? (
                          <div>
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full h-[600px] p-4 bg-gray-900 text-gray-100 font-mono text-xs rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                              placeholder="Введіть HTML код шаблону..."
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              💡 Використовуйте змінні у форматі {`{{variable_name}}`} для динамічних даних
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto h-[600px]">
                            <pre className="text-xs font-mono">
                              {currentTemplate.content}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Variables sidebar */}
                      {showVariables && (
                        <div className="col-span-4">
                          <Card className="sticky top-4">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold">Доступні змінні</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowVariables(false)}
                                  className="h-6 w-6 p-0"
                                >
                                  ✕
                                </Button>
                              </div>
                              <CardDescription className="text-xs">
                                Натисніть, щоб скопіювати змінну
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[560px] overflow-y-auto">
                              <div className="space-y-1">
                                {templateVariables[selectedType]?.map((item, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.var);
                                      toast.success('Скопійовано!', { duration: 1000 });
                                    }}
                                    className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors group"
                                  >
                                    <code className="text-xs font-mono text-blue-600 group-hover:text-blue-700">
                                      {item.var}
                                    </code>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {item.desc}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>

                    {/* Show variables button when hidden */}
                    {!showVariables && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVariables(true)}
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Показати доступні змінні
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50">
                    <div className="text-gray-500">Шаблон не знайдено</div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateEditor;
