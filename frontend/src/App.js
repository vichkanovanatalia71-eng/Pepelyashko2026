import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Plus, Trash2, Search, FileText, Users, Receipt, Loader2, Package, FileSignature, ArrowLeft, Eye, X, RefreshCw, FileCheck, Truck, CheckCircle } from 'lucide-react';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// DocumentForm component defined outside to prevent re-creation on each render
const DocumentForm = ({ 
  endpoint, 
  docType, 
  title, 
  searchEdrpou, 
  setSearchEdrpou,
  foundCounterparty,
  searchCounterparty,
  documentForm,
  addItem,
  removeItem,
  updateItem,
  handleDocumentSubmit,
  loading
}) => (
  <Card className="glass-card" data-testid={`${endpoint}-form-card`}>
    <CardHeader>
      <CardTitle className="text-2xl" data-testid={`${endpoint}-form-title`}>{title}</CardTitle>
      <CardDescription data-testid={`${endpoint}-form-description`}>Створіть новий документ</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={(e) => handleDocumentSubmit(e, endpoint, docType)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="search-edrpou" data-testid="search-edrpou-label">Пошук контрагента за ЄДРПОУ</Label>
          <div className="flex gap-2">
            <Input
              id="search-edrpou"
              data-testid="search-edrpou-input"
              value={searchEdrpou}
              onChange={(e) => setSearchEdrpou(e.target.value)}
              placeholder="Введіть код ЄДРПОУ"
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={searchCounterparty}
              data-testid="search-counterparty-btn"
              className="btn-primary"
            >
              <Search className="w-4 h-4 mr-2" />
              Знайти
            </Button>
          </div>
          {foundCounterparty && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg" data-testid="found-counterparty-info">
              <p className="text-sm font-medium text-teal-900">
                {foundCounterparty.representative_name}
              </p>
              <p className="text-xs text-teal-700">
                {foundCounterparty.email} | {foundCounterparty.phone}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label data-testid="items-label">Товари/Роботи</Label>
            <Button 
              type="button" 
              onClick={addItem} 
              size="sm"
              data-testid="add-item-btn"
              className="btn-secondary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Додати
            </Button>
          </div>

          {documentForm.items.map((item, index) => (
            <div key={index} className="item-card p-4 space-y-3" data-testid={`item-card-${index}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" data-testid={`item-name-label-${index}`}>Назва</Label>
                  <Input
                    data-testid={`item-name-input-${index}`}
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    placeholder="Назва товару"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs" data-testid={`item-unit-label-${index}`}>Одиниця виміру</Label>
                  <Input
                    data-testid={`item-unit-input-${index}`}
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    placeholder="шт, кг, л"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs" data-testid={`item-quantity-label-${index}`}>Кількість</Label>
                  <Input
                    data-testid={`item-quantity-input-${index}`}
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs" data-testid={`item-price-label-${index}`}>Ціна</Label>
                  <Input
                    data-testid={`item-price-input-${index}`}
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs" data-testid={`item-amount-label-${index}`}>Сума</Label>
                  <Input
                    data-testid={`item-amount-input-${index}`}
                    type="number"
                    value={item.amount.toFixed(2)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
              {documentForm.items.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeItem(index)}
                  data-testid={`remove-item-btn-${index}`}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Видалити
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold" data-testid="total-amount-label">Загальна сума:</Label>
            <span className="text-2xl font-bold text-teal-700" data-testid="total-amount-value">
              {documentForm.total_amount.toFixed(2)} грн
            </span>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading || !foundCounterparty}
          data-testid={`submit-${endpoint}-btn`}
          className="w-full btn-primary py-6 text-lg"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Збереження...</>
          ) : (
            <>Створити {docType}</>
          )}
        </Button>
      </form>
    </CardContent>
  </Card>
);

function App() {
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [counterpartyDocuments, setCounterpartyDocuments] = useState(null);
  const [searchCounterpartyEdrpou, setSearchCounterpartyEdrpou] = useState('');
  
  // Counterparty form state
  const [counterpartyForm, setCounterpartyForm] = useState({
    edrpou: '',
    representative_name: '',
    email: '',
    phone: '',
    iban: '',
    contract_type: 'Класичний',
    director_position: '',
    director_name: ''
  });

  // Document form state
  const [documentForm, setDocumentForm] = useState({
    counterparty_edrpou: '',
    items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
    total_amount: 0
  });

  const [searchEdrpou, setSearchEdrpou] = useState('');
  const [foundCounterparty, setFoundCounterparty] = useState(null);
  
  // Order creation dialog state
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState({
    order: true,  // Auto-checked by default
    invoice: false,
    act: false,
    waybill: false,
    contract: false
  });
  const [contractForm, setContractForm] = useState({
    subject: '',
    amount: 0
  });
  
  // Contract PDF preview dialog state
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [contractPdfData, setContractPdfData] = useState(null);
  const [contractEmailForm, setContractEmailForm] = useState({
    recipient: 'counterparty', // 'counterparty', 'own', 'custom'
    customEmail: '',
    counterpartyEmail: ''
  });
  
  // Document PDF preview dialog state (for invoices, acts, waybills)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentPdfData, setDocumentPdfData] = useState(null);
  const [documentEmailForm, setDocumentEmailForm] = useState({
    recipient: 'counterparty',
    customEmail: '',
    counterpartyEmail: ''
  });
  const [currentDocType, setCurrentDocType] = useState(''); // 'invoice', 'act', 'waybill'
  
  // Document creation from counterparty view
  const [showDocCreateDialog, setShowDocCreateDialog] = useState(false);
  const [docTypeToCreate, setDocTypeToCreate] = useState('');
  
  // All documents state (for lists in tabs)
  const [allInvoices, setAllInvoices] = useState([]);
  const [allActs, setAllActs] = useState([]);
  const [allWaybills, setAllWaybills] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  // Contract template
  const [contractTemplate, setContractTemplate] = useState('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSettings, setTemplateSettings] = useState({
    fontSize: 12,
    fontFamily: 'Times New Roman',
    lineSpacing: 1.5,
    indent: 0
  });
  
  // Order template
  const [orderTemplate, setOrderTemplate] = useState('');
  const [showOrderTemplateEditor, setShowOrderTemplateEditor] = useState(false);
  const [showCreateFromOrder, setShowCreateFromOrder] = useState(false);
  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentOrderDetails, setCurrentOrderDetails] = useState(null);
  
  // Act template
  const [actTemplate, setActTemplate] = useState('');
  const [showActTemplateEditor, setShowActTemplateEditor] = useState(false);
  
  // Act from orders
  const [actType, setActType] = useState('without-orders'); // 'without-orders' or 'with-orders'
  const [actCounterpartyEdrpou, setActCounterpartyEdrpou] = useState('');
  const [actFoundCounterparty, setActFoundCounterparty] = useState(null);
  const [actAvailableOrders, setActAvailableOrders] = useState([]);
  const [actSelectedOrders, setActSelectedOrders] = useState([]);
  const [actAvailableContracts, setActAvailableContracts] = useState([]);
  const [actSelectedContract, setActSelectedContract] = useState('');
  
  // Contract from orders
  const [contractBasedOnOrder, setContractBasedOnOrder] = useState(false);
  const [contractAvailableOrders, setContractAvailableOrders] = useState([]);
  const [contractSelectedOrders, setContractSelectedOrders] = useState([]);  // Changed to array for multiple selection
  
  const [relatedDocuments, setRelatedDocuments] = useState({
    invoices: [],
    acts: [],
    waybills: [],
    contracts: []
  });
  
  const insertAlignment = (alignType) => {
    const textarea = document.querySelector('#template-editor');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contractTemplate.substring(start, end);
    
    if (selectedText) {
      // Wrap selected text with alignment markers
      const newText = contractTemplate.substring(0, start) + 
                     `[align:${alignType}]${selectedText}[/align]` + 
                     contractTemplate.substring(end);
      setContractTemplate(newText);
    } else {
      // Insert alignment markers at cursor position
      const newText = contractTemplate.substring(0, start) + 
                     `[align:${alignType}]текст[/align]` + 
                     contractTemplate.substring(start);
      setContractTemplate(newText);
    }
  };

  const applyFormatting = (formatType) => {
    const textarea = document.querySelector('#template-editor');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contractTemplate.substring(start, end);
    
    if (selectedText) {
      let formattedText = '';
      switch(formatType) {
        case 'bold':
          formattedText = `[b]${selectedText}[/b]`;
          break;
        case 'italic':
          formattedText = `[i]${selectedText}[/i]`;
          break;
        case 'underline':
          formattedText = `[u]${selectedText}[/u]`;
          break;
        default:
          formattedText = selectedText;
      }
      
      const newText = contractTemplate.substring(0, start) + formattedText + contractTemplate.substring(end);
      setContractTemplate(newText);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + formattedText.length;
        textarea.focus();
      }, 0);
    } else {
      toast.error('Виділіть текст для форматування');
    }
  };

  const insertVariable = (variableName, editorId = 'template-editor') => {
    const textarea = document.querySelector(`#${editorId}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const variable = `{{${variableName}}}`;
    
    // Determine which template to update based on editor ID
    if (editorId === 'order-template-editor') {
      const newText = orderTemplate.substring(0, start) + variable + orderTemplate.substring(start);
      setOrderTemplate(newText);
    } else if (editorId === 'act-template-editor') {
      const newText = actTemplate.substring(0, start) + variable + actTemplate.substring(start);
      setActTemplate(newText);
    } else {
      const newText = contractTemplate.substring(0, start) + variable + contractTemplate.substring(start);
      setContractTemplate(newText);
    }
    
    // Restore cursor position after variable
    setTimeout(() => {
      textarea.selectionStart = start + variable.length;
      textarea.selectionEnd = start + variable.length;
      textarea.focus();
    }, 0);
  };

  // Function to convert number to Ukrainian text
  const numberToUkrainianText = (num) => {
    if (!num || num === 0) return 'нуль гривень 00 копійок';
    
    const hryvni = Math.floor(num);
    const kopiiky = Math.round((num - hryvni) * 100);
    
    const ones = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];
    const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const thousands = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    
    const getThousands = (n) => {
      if (n === 1) return 'тисяча';
      if (n >= 2 && n <= 4) return 'тисячі';
      return 'тисяч';
    };
    
    const getHryvni = (n) => {
      const lastDigit = n % 10;
      const lastTwoDigits = n % 100;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'гривень';
      if (lastDigit === 1) return 'гривня';
      if (lastDigit >= 2 && lastDigit <= 4) return 'гривні';
      return 'гривень';
    };
    
    const getKopiiky = (n) => {
      const lastDigit = n % 10;
      const lastTwoDigits = n % 100;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'копійок';
      if (lastDigit === 1) return 'копійка';
      if (lastDigit >= 2 && lastDigit <= 4) return 'копійки';
      return 'копійок';
    };
    
    let result = '';
    
    // Thousands
    const thousandsNum = Math.floor(hryvni / 1000);
    if (thousandsNum > 0) {
      const th = thousandsNum % 10;
      const thTens = Math.floor(thousandsNum / 10) % 10;
      const thHundreds = Math.floor(thousandsNum / 100);
      
      if (thHundreds > 0) result += hundreds[thHundreds] + ' ';
      if (thTens === 1) {
        result += teens[th] + ' ';
      } else {
        if (thTens > 1) result += tens[thTens] + ' ';
        if (th > 0) result += thousands[th] + ' ';
      }
      result += getThousands(thousandsNum) + ' ';
    }
    
    // Hundreds, tens, ones
    const remainder = hryvni % 1000;
    const h = Math.floor(remainder / 100);
    const t = Math.floor((remainder % 100) / 10);
    const o = remainder % 10;
    
    if (h > 0) result += hundreds[h] + ' ';
    if (t === 1) {
      result += teens[o] + ' ';
    } else {
      if (t > 1) result += tens[t] + ' ';
      if (o > 0) result += ones[o] + ' ';
    }
    
    result += getHryvni(hryvni) + ' ';
    result += String(kopiiky).padStart(2, '0') + ' ' + getKopiiky(kopiiky);
    
    return result.trim();
  };

  useEffect(() => {
    // Очистити старі шаблони акту при першому завантаженні
    const actTemplateVersion = localStorage.getItem('actTemplateVersion');
    const CURRENT_ACT_VERSION = '2.0'; // Нова версія з виправленнями
    
    if (actTemplateVersion !== CURRENT_ACT_VERSION) {
      console.log('Clearing old act template from localStorage');
      localStorage.removeItem('actTemplate');
      localStorage.removeItem('actTemplateVersion');
      localStorage.setItem('actTemplateVersion', CURRENT_ACT_VERSION);
    }
    
    fetchCounterparties();
    fetchAllDocuments();
    loadContractTemplate();
    loadOrderTemplate();
    loadActTemplate();
  }, []);

  const loadOrderRelatedDocuments = async (orderNumber) => {
    try {
      console.log('Loading related documents for order:', orderNumber);
      const response = await axios.get(`${API}/orders/${orderNumber}/related-documents`);
      console.log('Related documents response:', response.data);
      setRelatedDocuments(response.data);
    } catch (error) {
      console.error('Error loading related documents:', error);
      toast.error('Помилка завантаження пов\'язаних документів');
    }
  };

  const fetchCounterparties = async () => {
    try {
      const response = await axios.get(`${API}/counterparties`);
      setCounterparties(response.data);
    } catch (error) {
      console.error('Error fetching counterparties:', error);
    }
  };
  
  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersResponse = await axios.get(`${API}/orders`);
      setAllOrders(ordersResponse.data.reverse()); // Newest first
      
      // Fetch invoices
      const invoicesResponse = await axios.get(`${API}/invoices`);
      setAllInvoices(invoicesResponse.data.reverse()); // Newest first
      
      // Fetch acts
      const actsResponse = await axios.get(`${API}/acts`);
      setAllActs(actsResponse.data.reverse()); // Newest first
      
      // Fetch waybills
      const waybillsResponse = await axios.get(`${API}/waybills`);
      setAllWaybills(waybillsResponse.data.reverse()); // Newest first
      
      // Fetch contracts - need to add this endpoint
      try {
        const contractsResponse = await axios.get(`${API}/contracts`);
        setAllContracts(contractsResponse.data.reverse()); // Newest first
      } catch (error) {
        console.log('Contracts endpoint not available yet');
      }
      
      toast.success('Документи оновлено!');
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Помилка при оновленні документів: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const loadContractTemplate = () => {
    const savedTemplate = localStorage.getItem('contractTemplate');
    const savedVersion = localStorage.getItem('contractTemplateVersion');
    const savedSettings = localStorage.getItem('contractTemplateSettings');
    
    // Current template version
    const CURRENT_VERSION = '5.0';
    
    // Check if saved template exists and version matches
    if (savedTemplate && savedVersion === CURRENT_VERSION) {
      setContractTemplate(savedTemplate);
    } else {
      // Set default HTML template (new version)
      const defaultTemplate = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Договір постачання товарів та/або надання послуг № {{contract_number}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* Параметри друку під A4 */
    @page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }

    /* Базова типографіка (офіційний вигляд) */
    html, body {
      margin: 0; padding: 0; background: #fff; color: #111;
      font: 12px/1.4 "Times New Roman", serif; /* зменшений міжрядковий інтервал */
    }

    /* Контейнер */
    .wrap { max-width: 17cm; margin: 0 auto; padding: 0; }

    /* Заголовки */
    h1 { text-align: center; margin: 10px 0 6px; font-size: 14px; font-weight: bold; letter-spacing: .2px; }
    h2 { text-align: center; margin: 10px 0 6px; font-size: 12px; font-weight: bold; }

    /* Абзаци */
    p { margin: 6px 0; text-align: justify; font-size: 12px; }
    /* Єдине вирівнювання нумерації: цифра+крапка — в одній вертикалі */
    p.num { text-indent: -1.6em; margin-left: 1.6em; }

    /* Шапка: місто/дата (компактніше) */
    .header-line { width: 100%; margin: 6px 0 10px; }
    .header-line table { width: 100%; border: 0; border-collapse: collapse; }
    .header-line td { border: 0; padding: 0; vertical-align: top; line-height: 1.2; }
    .left { text-align: left; }
    .right { text-align: right; }

    /* Розділи */
    .sec { padding: 8px 0 4px; margin: 0; page-break-inside: avoid; }

    /* Таблиця реквізитів (2 колонки, фіксована) */
    .requisites-table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
    .requisites-table th,
    .requisites-table td {
      border: 1px solid #cfd4d9;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 12px;
      word-wrap: break-word;
    }
    .requisites-table th { text-align: center; background: #f7f7f7; font-weight: bold; }
    .requisites-table td { width: 50%; }

    /* Службові */
    .center { text-align: center; }
    .nowrap { white-space: nowrap; }

    /* Компенсація для друку довгих IBAN/e-mail/телефону */
    .mono { font-family: "Courier New", Courier, monospace; font-size: 12px; white-space: nowrap; }

    /* Менше вдів/сиріт при друці */
    p { orphans: 3; widows: 3; }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- Титул -->
    <h1>ДОГОВІР ПОСТАЧАННЯ ТОВАРІВ ТА/АБО НАДАННЯ ПОСЛУГ № {{contract_number}}</h1>

    <!-- Місто/дата -->
    <div class="header-line">
      <table>
        <tr>
          <td class="left">м. Одеса</td>
          <td class="right">«{{contract_date}}» р.</td>
        </tr>
      </table>
    </div>

    <!-- Преамбула -->
    <div class="sec">
      <p><strong>{{supplier_name}}</strong>, ЄДРПОУ {{supplier_edrpou}} (надалі – «Виконавець»), {{supplier_representative}}, з однієї сторони, та
         <strong>{{buyer_name}}</strong>, ЄДРПОУ {{buyer_edrpou}} (надалі – «Замовник»), {{buyer_representative}}, з другої сторони,
         які в подальшому разом іменуються «Сторони», а кожна окремо – «Сторона», уклали цей Договір про наступне:</p>
    </div>

    <!-- 1 -->
    <div class="sec">
      <h2>1. ПРЕДМЕТ ДОГОВОРУ</h2>
      <p class="num">1.1. Виконавець зобов'язується поставити товари та/або надати послуги, визначені у Специфікації (Додаток 1), а Замовник – прийняти та оплатити їх на умовах цього Договору.</p>
      <p class="num">1.2. <strong>Предмет:</strong> {{subject}}. Конкретні характеристики, обсяги та строки – у Специфікації/«Замовленні».</p>
      <p class="num">1.3. У разі змішаного предмета (товари і послуги) застосовуються положення цього Договору для обох видів зобов'язань.</p>
    </div>

    <!-- 2 -->
    <div class="sec">
      <h2>2. ПОРЯДОК ФОРМУВАННЯ ТА ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ</h2>
      <p class="num">2.1. Замовник формує «Замовлення» із зазначенням позицій, кількості/обсягу, місця та строків поставки/надання.</p>
      <p class="num">2.2. На підставі «Замовлення» формується Специфікація (Додаток 1) із полями: №, опис/найменування, код/артикул, вид (товар/послуга), од. виміру, кількість/обсяг, ціна без ПДВ, ставка ПДВ, сума без ПДВ, ПДВ, сума з ПДВ.</p>
      <p class="num">2.3. Підтвердження здійснюється шляхом підписання КЕП/обміну електронними листами з вкладеною Специфікацією. Е-документи прирівнюються до паперових згідно із законами України «Про електронні документи та електронний документообіг» і «Про електронні довірчі послуги».</p>
    </div>

    <!-- 3 -->
    <div class="sec">
      <h2>3. УМОВИ ПОСТАВКИ ТОВАРІВ</h2>
      <p class="num">3.1. Базис поставки (за потреби) – за Incoterms 2020 та/або інший погоджений у Специфікації.</p>
      <p class="num">3.2. Датою поставки є дата підписання видаткової накладної/ТТН або акта приймання-передачі.</p>
      <p class="num">3.3. Право власності та ризики випадкової загибелі/пошкодження переходять до Замовника з моменту підписання документа приймання.</p>
      <p class="num">3.4. Вимоги до якості, комплектності, тари, пакування та маркування – за ДСТУ/ТУ і умовами Специфікації; маркування українською мовою.</p>
    </div>

    <!-- 4 -->
    <div class="sec">
      <h2>4. НАДАННЯ ПОСЛУГ</h2>
      <p class="num">4.1. Обсяг, місце, строки та вимоги до результату послуг визначаються у Специфікації/«Замовленні».</p>
      <p class="num">4.2. Послуги приймаються за Актом наданих послуг. За відсутності мотивованих письмових зауважень протягом 5 робочих днів з моменту отримання Акта послуги вважаються прийнятими.</p>
    </div>

    <!-- 5 -->
    <div class="sec">
      <h2>5. ГАРАНТІЙНІ ЗОБОВ'ЯЗАННЯ (ДЛЯ ТОВАРІВ)</h2>
      <p class="num">5.1. Гарантійний строк – згідно з документацією виробника або погоджений у Специфікації (якщо більший).</p>
      <p class="num">5.2. У межах гарантії Виконавець безоплатно усуває недоліки/здійснює заміну у розумний строк, але не більше 30 календарних днів, якщо інше не погоджено.</p>
      <p class="num">5.3. Гарантія не поширюється на випадки порушення правил зберігання/експлуатації/монтажу, механічні пошкодження та форс-мажор.</p>
    </div>

    <!-- 6 -->
    <div class="sec">
      <h2>6. ЯКІСТЬ ТА ПРИЙМАННЯ ЗА КІЛЬКІСТЮ І ЯКІСТЮ</h2>
      <p class="num">6.1. Приймання за кількістю здійснюється під час отримання; за якістю – протягом 14 календарних днів або у строки, встановлені обов'язковими вимогами для конкретної продукції.</p>
      <p class="num">6.2. Невідповідності фіксуються актом розбіжностей із доданням доказів (фото/відео). Сторони узгоджують заміну/доукомплектування/знижку.</p>
    </div>

    <!-- 7 -->
    <div class="sec">
      <h2>7. ЦІНА, ПОДАТКИ ТА РОЗРАХУНКИ</h2>
      <p class="num">7.1. Загальна вартість за Договором: <strong>{{total_amount}} грн</strong> ({{total_amount_text}}) {{vat_note}}. Деталізація по позиціях – у Специфікації.</p>
      <p class="num">7.2. Валюта розрахунків – гривня. Податковий статус Сторін (ПДВ/не ПДВ/ЄП) застосовується згідно з їхнім статусом.</p>
      <p class="num">7.3. Умови оплати: передоплата/післяплата/відстрочка – відповідно до Специфікації. Підстави платежу: рахунок/накладна/Акт.</p>
      <p class="num">7.4. Для платників ПДВ – реєстрація податкової накладної в ЄРПН у строки, визначені ПКУ. Банківські витрати – за платником, якщо інше не погоджено.</p>
    </div>

    <!-- 8 -->
    <div class="sec">
      <h2>8. КОНФІДЕНЦІЙНІСТЬ ТА ЗАХИСТ ПЕРСОНАЛЬНИХ ДАНИХ</h2>
      <p class="num">8.1. Інформація за цим Договором є конфіденційною; розголошення без письмової згоди іншої Сторони заборонено, крім випадків, передбачених законом.</p>
      <p class="num">8.2. Обробка персональних даних здійснюється відповідно до Закону України «Про захист персональних даних». Сторони є окремими володільцями/розпорядниками та гарантують законні підстави обробки.</p>
    </div>

    <!-- 9 -->
    <div class="sec">
      <h2>9. ПРАВА ІНТЕЛЕКТУАЛЬНОЇ ВЛАСНОСТІ (ДЛЯ РЕЗУЛЬТАТІВ ПОСЛУГ)</h2>
      <p class="num">9.1. Майнові права інтелектуальної власності на результати, створені і оплачені за цим Договором, переходять до Замовника з моменту підписання Акта та повної оплати, якщо інше не встановлено Специфікацією.</p>
      <p class="num">9.2. Умови щодо виключних/невиключних прав, території, строку та способів використання визначаються у Специфікації.</p>
    </div>

    <!-- 10 -->
    <div class="sec">
      <h2>10. ВІДПОВІДАЛЬНІСТЬ СТОРІН</h2>
      <p class="num">10.1. За прострочення поставки/надання – пеня 0,1% від вартості простроченого зобов'язання за кожен день, але не більше 10% від відповідної вартості, якщо інше не погоджено.</p>
      <p class="num">10.2. За прострочення оплати – інфляційні втрати та 3% річних (ст. 625 ЦКУ); за домовленістю може застосовуватись пеня у розмірі подвійної облікової ставки НБУ.</p>
      <p class="num">10.3. Сплата санкцій не звільняє від виконання основного зобов'язання.</p>
    </div>

    <!-- 11 -->
    <div class="sec">
      <h2>11. ФОРС-МАЖОР</h2>
      <p class="num">11.1. Обставини непереборної сили (військові дії, акти органів влади, стихійні лиха, пожежі, блокада, кібератаки тощо), підтверджені ТПП України, звільняють Сторони від відповідальності на період їх дії. Повідомлення – протягом 5 робочих днів.</p>
      <p class="num">11.2. Строк виконання зобов'язань продовжується на час дії форс-мажору; якщо він триває понад 60 днів, кожна зі Сторін має право ініціювати розірвання Договору.</p>
    </div>

    <!-- 12 -->
    <div class="sec">
      <h2>12. СТРОК ДІЇ ДОГОВОРУ, ЗМІНИ ТА РОЗІРВАННЯ</h2>
      <p class="num">12.1. Договір чинний з дати підписання і діє до «{{end_date}}» або до повного виконання зобов'язань, залежно від того, що настане пізніше.</p>
      <p class="num">12.2. Зміни/доповнення дійсні лише у письмовій формі, у т. ч. у формі е-документів, підписаних КЕП уповноважених осіб.</p>
      <p class="num">12.3. Договір може бути розірваний за взаємною згодою або в односторонньому порядку у разі істотного порушення з письмовим повідомленням не менш як за 10 календарних днів.</p>
    </div>

    <!-- 13 -->
    <div class="sec">
      <h2>13. ОБМІН ДОКУМЕНТАМИ</h2>
      <p class="num">13.1. Сторони визнають юридичну силу електронних документів (КЕП, ЕДО/EDI, службові e-mail з корпоративних доменів) відповідно до законодавства України.</p>
      <p class="num">13.2. Оригінали (за потреби) обмінюються поштою/кур'єром протягом 10 робочих днів після запиту.</p>
    </div>

    <!-- 14 -->
    <div class="sec">
      <h2>14. РЕКВІЗИТИ СТОРІН</h2>
      <table class="requisites-table">
        <thead>
          <tr>
            <th>ВИКОНАВЕЦЬ</th>
            <th>ЗАМОВНИК</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <p><strong>Назва:</strong> {{supplier_name}}</p>
              <p><strong>ЄДРПОУ/РНОКПП:</strong> <span class="mono">{{supplier_edrpou}}</span></p>
              <p><strong>Адреса:</strong> {{supplier_address}}</p>
              <p><strong>IBAN:</strong> <span class="mono">{{supplier_iban}}</span></p>
              <p><strong>Банк:</strong> {{supplier_bank}}</p>
              <p><strong>МФО:</strong> <span class="mono">{{supplier_mfo}}</span></p>
              <p><strong>Email:</strong> <span class="mono">{{supplier_email}}</span></p>
              <p><strong>Тел.:</strong> <span class="mono">{{supplier_phone}}</span></p>
              <p class="signline"><strong>Підпис:</strong> ______________________ / {{supplier_signature}} /</p>
            </td>
            <td>
              <p><strong>Назва:</strong> {{buyer_name}}</p>
              <p><strong>ЄДРПОУ:</strong> <span class="mono">{{buyer_edrpou}}</span></p>
              <p><strong>Адреса:</strong> {{buyer_address}}</p>
              <p><strong>IBAN:</strong> <span class="mono">{{buyer_iban}}</span></p>
              <p><strong>Банк:</strong> {{buyer_bank}}</p>
              <p><strong>МФО:</strong> <span class="mono">{{buyer_mfo}}</span></p>
              <p><strong>Email:</strong> <span class="mono">{{buyer_email}}</span></p>
              <p><strong>Тел.:</strong> <span class="mono">{{buyer_phone}}</span></p>
              <p class="signline"><strong>Підпис:</strong> ______________________ / {{buyer_signature}} /</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</body>
</html>`;
      
      setContractTemplate(defaultTemplate);
    }
    
    if (savedSettings) {
      setTemplateSettings(JSON.parse(savedSettings));
    }
  };
  
  const loadOrderTemplate = () => {
    const savedTemplate = localStorage.getItem('orderTemplate');
    const savedVersion = localStorage.getItem('orderTemplateVersion');
    
    // Current template version
    const CURRENT_VERSION = '2.0';
    
    // Check if saved template exists and version matches
    if (savedTemplate && savedVersion === CURRENT_VERSION) {
      setOrderTemplate(savedTemplate);
    } else {
      // Load default template from order_template.html
      const defaultOrderTemplate = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Замовлення № {{order_number}} від {{order_date}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }

    html, body {
      margin: 0; padding: 0; background: #fff; color: #111;
      font: 12px/1.4 "Times New Roman", serif;
    }
    .wrap { max-width: 17cm; margin: 0 auto; }

    h1 { text-align: center; margin: 10px 0 8px; font-size: 16px; font-weight: bold; }

    .meta { width: 100%; margin: 6px 0 10px; border-collapse: collapse; }
    .meta td { padding: 2px 0; vertical-align: top; }

    /* Розділи */
    .block-title {
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      margin: 10px 0 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Таблиця позицій */
    table.items {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 6px;
    }
    table.items thead { background: #f7f7f7; }
    table.items th, table.items td {
      border: 1px solid #cfd4d9;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 12px;
    }
    table.items th { text-align: center; font-weight: bold; }
    .ncol   { width: 28px;  text-align: center; }
    .name   { width: 36%;   }
    .unit   { width: 10%;   text-align: center; }
    .numeric{ text-align: right; width: 13%; }

    /* Підсумки */
    table.items tfoot td {
      border: 1px solid #cfd4d9;
      font-weight: bold;
      background: #fafafa;
    }
    .tfoot-label { text-align: right; }
    .tfoot-sum   { text-align: right; width: 14%; }

    /* Реквізити */
    .requisites { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 12px; }
    .requisites th, .requisites td {
      border: 1px solid #cfd4d9; padding: 6px 8px; vertical-align: top; font-size: 12px;
    }
    .requisites th { background: #f7f7f7; text-align: center; font-weight: bold; }
    .requisites td { width: 50%; }
    .mono { font-family: "Courier New", monospace; white-space: nowrap; }

    .signline { margin-top: 10px; }

    /* Друк */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    @media print { a[href]:after { content: ""; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>ЗАМОВЛЕННЯ № {{order_number}} ВІД {{order_date}}</h1>

    <table class="meta">
      <tr>
        <td><strong>Місце складання:</strong> м. Одеса</td>
      </tr>
    </table>

    <div class="block-title">Перелік позицій</div>
    <table class="items">
      <thead>
        <tr>
          <th class="ncol">№</th>
          <th class="name">Найменування</th>
          <th class="unit">Од. виміру</th>
          <th class="numeric">Кількість</th>
          <th class="numeric">Ціна, грн</th>
          <th class="numeric">Сума, грн</th>
        </tr>
      </thead>
      <tbody>
        {{items_rows}}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="tfoot-label">Разом без ПДВ, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_net}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label">ПДВ {{vat_rate}}%, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_vat}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label"><strong>Всього до сплати, грн</strong></td>
          <td class="tfoot-sum"><strong><span class="mono">{{total_gross}}</span></strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="block-title">Роз'яснення</div>
    <ol style="margin:6px 0 0 18px; padding:0;">
      <li>Даний документ є первинним погодженим Замовленням між Покупцем і Постачальником, що визначає обсяг, кількість, вартість і найменування товарів та/або послуг.</li>
      <li>Замовлення є підставою для подальшого укладення Договору постачання товарів та/або надання послуг між Сторонами.</li>
      <li>Ціни, зазначені в Замовленні, діють до моменту укладення Договору або письмового підтвердження змін, якщо інше не погоджено Сторонами.</li>
      <li>Підписання цього Замовлення засвідчує намір Сторін здійснити відповідну поставку товарів або надання послуг на погоджених умовах.</li>
      <li>Документ може підписуватись у паперовому вигляді або електронними засобами з використанням кваліфікованого електронного підпису (КЕП).</li>
      <li>Цей документ не створює фінансових зобов'язань до моменту укладення основного Договору, але є підтвердженням узгодження номенклатури та вартості.</li>
    </ol>

    <div class="block-title" style="margin-top:14px;">Підписи сторін</div>
    <table class="requisites">
      <tr>
        <th>ПОКУПЕЦЬ</th>
        <th>ПОСТАЧАЛЬНИК</th>
      </tr>
      <tr>
        <td>
          <p><strong>Назва:</strong> {{buyer_name}}</p>
          <p><strong>ЄДРПОУ:</strong> <span class="mono">{{buyer_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{buyer_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{buyer_iban}}</span></p>
          <p><strong>Банк:</strong> {{buyer_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{buyer_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{buyer_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{buyer_phone}}</span></p>
          <p class="signline" style="margin-top:12px;"><strong>Підпис:</strong> {{buyer_signature}}</p>
        </td>
        <td>
          <p><strong>Назва:</strong> {{supplier_name}}</p>
          <p><strong>ЄДРПОУ/РНОКПП:</strong> <span class="mono">{{supplier_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{supplier_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{supplier_iban}}</span></p>
          <p><strong>Банк:</strong> {{supplier_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{supplier_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{supplier_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{supplier_phone}}</span></p>
          <p class="signline" style="margin-top:12px;"><strong>Підпис:</strong> {{supplier_signature}}</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
      
      setOrderTemplate(defaultOrderTemplate);
    }
  };
  
  const saveContractTemplate = () => {
    localStorage.setItem('contractTemplate', contractTemplate);
    localStorage.setItem('contractTemplateVersion', '5.0');
    localStorage.setItem('contractTemplateSettings', JSON.stringify(templateSettings));
    toast.success('Шаблон договору збережено!');
    setShowTemplateEditor(false);
  };
  
  const resetContractTemplate = () => {
    if (window.confirm('Ви впевнені що хочете скинути шаблон до стандартного?')) {
      localStorage.removeItem('contractTemplate');
      localStorage.removeItem('contractTemplateVersion');
      localStorage.removeItem('contractTemplateSettings');
      // Reload template
      loadContractTemplate();
      setTemplateSettings({
        fontSize: 12,
        fontFamily: 'Times New Roman',
        lineSpacing: 1.5,
        indent: 0
      });
      toast.success('Шаблон скинуто до стандартного!');
    }
  };
  
  const saveOrderTemplate = () => {
    localStorage.setItem('orderTemplate', orderTemplate);
    localStorage.setItem('orderTemplateVersion', '2.0');
    toast.success('Шаблон замовлення збережено!');
    setShowOrderTemplateEditor(false);
  };
  
  const resetOrderTemplate = () => {
    if (window.confirm('Ви впевнені що хочете скинути шаблон до стандартного?')) {
      localStorage.removeItem('orderTemplate');
      localStorage.removeItem('orderTemplateVersion');
      // Set default template from backend
      setOrderTemplate('');
      toast.success('Шаблон скинуто до стандартного!');
    }
  };
  
  const loadActTemplate = () => {
    const savedTemplate = localStorage.getItem('actTemplate');
    const savedVersion = localStorage.getItem('actTemplateVersion');
    
    // Current template version
    const CURRENT_VERSION = '1.0';
    
    // Check if saved template exists and version matches
    if (savedTemplate && savedVersion === CURRENT_VERSION) {
      setActTemplate(savedTemplate);
    } else {
      // Load default template for Act
      const defaultActTemplate = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Акт наданих послуг № {{act_number}} від {{act_date}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }
    html,body{margin:0;padding:0;background:#fff;color:#111;font:12px/1.4 "Times New Roman",serif}
    .wrap{max-width:17cm;margin:0 auto}

    h1{ text-align:center; margin:10px 0 8px; font-size:16px; font-weight:bold; }
    .block-title{ text-align:center; font-weight:bold; font-size:11px; margin:10px 0 6px; text-transform:uppercase; letter-spacing:.3px; }

    .meta{width:100%;margin:6px 0 10px;border-collapse:collapse}
    .meta td{padding:2px 0;vertical-align:top}

    ol.points{ margin:6px 0 10px 18px; padding:0; }
    ol.points li{ margin:4px 0; }

    table.items{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:6px}
    table.items thead{background:#f7f7f7}
    table.items th,table.items td{border:1px solid #cfd4d9;padding:6px 8px;vertical-align:top;font-size:12px}
    table.items th{text-align:center;font-weight:bold}
    .ncol{width:28px;text-align:center}
    .name{width:46%}
    .unit{width:10%;text-align:center}
    .numeric{text-align:right}
    table.items tfoot td{border:1px solid #cfd4d9;font-weight:bold;background:#fafafa}
    .tfoot-label{text-align:right}
    .tfoot-sum{text-align:right;width:14%}

    .requisites{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px}
    .requisites th,.requisites td{border:1px solid #cfd4d9;padding:6px 8px;vertical-align:top;font-size:12px}
    .requisites th{background:#f7f7f7;text-align:center;font-weight:bold}
    .requisites td{width:50%}
    .mono{font-family:"Courier New",monospace;white-space:nowrap}
    .signline{margin-top:10px}

    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    @media print{a[href]:after{content:""}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>АКТ НАДАНИХ ПОСЛУГ № {{act_number}} ВІД {{act_date}}</h1>

    <table class="meta">
      <tr><td><strong>Місце складання:</strong> м. Одеса</td></tr>
      <tr><td><strong>Підстава (за наявності):</strong> {{basis}}</td></tr>
    </table>

    <div class="sec">
      <p><strong>{{supplier_name}}</strong>, ЄДРПОУ {{supplier_edrpou}} (надалі – «Виконавець»), {{supplier_representative}}, з однієї сторони, та
         <strong>{{buyer_name}}</strong>, ЄДРПОУ {{buyer_edrpou}} (надалі – «Замовник»), {{buyer_representative}}, з другої сторони,
         які в подальшому разом іменуються «Сторони», а кожна окремо – «Сторона», склали цей Акт про таке:</p>
    </div>

    <ol class="points" start="1">
      <li>Виконавець надав Замовнику послуги відповідно до погоджених умов.</li>
      <li>Перелік, обсяг, одиниці виміру, кількість, ціна та сума наданих послуг наведені у таблиці нижче і є невід'ємною частиною цього Акта.</li>
    </ol>

    <table class="items">
      <thead>
        <tr>
          <th class="ncol">№</th>
          <th class="name">Найменування послуги / опис робіт</th>
          <th class="unit">Од. виміру</th>
          <th class="numeric">Кількість</th>
          <th class="numeric">Ціна, грн</th>
          <th class="numeric">Сума, грн</th>
        </tr>
      </thead>
      <tbody>
        {{items_rows}}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="tfoot-label">Разом без ПДВ, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_net}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label">ПДВ {{vat_rate}}%, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_vat}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label"><strong>Всього до сплати, грн</strong></td>
          <td class="tfoot-sum"><strong><span class="mono">{{total_gross}}</span></strong></td>
        </tr>
        <tr>
          <td colspan="6" style="padding:8px;">
            <strong>Сума прописом:</strong> {{total_amount_text}}.
            <span style="margin-left:8px;"><strong>{{vat_note}}</strong></span>
          </td>
        </tr>
      </tfoot>
    </table>

    <ol class="points" start="3">
      <li>Результат наданих послуг передано Замовнику. Замовник претензій щодо обсягу, якості та строків не має.</li>
      <li>Цей Акт є первинним документом, що підтверджує факт надання послуг, та підлягає зберіганню відповідно до законодавства України.</li>
      <li>Акт складено українською мовою у двох примірниках з однаковою юридичною силою; може бути підписаний у паперовій формі або з використанням КЕП.</li>
    </ol>

    <div class="block-title">Сторони та підписи</div>
    <table class="requisites">
      <tr>
        <th>ЗАМОВНИК (ПОКУПЕЦЬ)</th>
        <th>ВИКОНАВЕЦЬ (ПОСТАЧАЛЬНИК)</th>
      </tr>
      <tr>
        <td>
          <p><strong>Назва:</strong> {{buyer_name}}</p>
          <p><strong>ЄДРПОУ:</strong> <span class="mono">{{buyer_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{buyer_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{buyer_iban}}</span></p>
          <p><strong>Банк:</strong> {{buyer_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{buyer_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{buyer_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{buyer_phone}}</span></p>
          <p><strong>В особі:</strong> {{buyer_representative}}</p>
          <p class="signline">Підпис: __________________ / ________ /</p>
          <p><strong>{{buyer_signature}}</strong></p>
        </td>
        <td>
          <p><strong>Назва:</strong> {{supplier_name}}</p>
          <p><strong>ЄДРПОУ/РНОКПП:</strong> <span class="mono">{{supplier_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{supplier_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{supplier_iban}}</span></p>
          <p><strong>Банк:</strong> {{supplier_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{supplier_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{supplier_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{supplier_phone}}</span></p>
          <p><strong>В особі:</strong> {{supplier_representative}}</p>
          <p class="signline">Підпис: __________________ / ________ /</p>
          <p><strong>{{supplier_signature}}</strong></p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
      
      setActTemplate(defaultActTemplate);
    }
  };
  
  const saveActTemplate = () => {
    localStorage.setItem('actTemplate', actTemplate);
    localStorage.setItem('actTemplateVersion', '1.0');
    toast.success('Шаблон акту збережено!');
    setShowActTemplateEditor(false);
  };
  
  const resetActTemplate = () => {
    if (window.confirm('Ви впевнені що хочете скинути шаблон до стандартного?')) {
      localStorage.removeItem('actTemplate');
      localStorage.removeItem('actTemplateVersion');
      setActTemplate('');
      loadActTemplate();
      toast.success('Шаблон акту скинуто до стандартного!');
    }
  };
  
  const searchAndViewCounterparty = async () => {
    if (!searchCounterpartyEdrpou) {
      toast.error('Введіть код ЄДРПОУ');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/counterparties/${searchCounterpartyEdrpou}`);
      setSelectedCounterparty(response.data);
      
      // Fetch documents
      const docsResponse = await axios.get(`${API}/counterparties/${searchCounterpartyEdrpou}/documents`);
      setCounterpartyDocuments(docsResponse.data);
      
      toast.success('Контрагента знайдено!');
    } catch (error) {
      toast.error('Контрагента не знайдено');
      setSelectedCounterparty(null);
      setCounterpartyDocuments(null);
    } finally {
      setLoading(false);
    }
  };
  
  
  const searchActCounterparty = async () => {
    if (!actCounterpartyEdrpou) {
      toast.error('Введіть код ЄДРПОУ');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Searching for counterparty:', actCounterpartyEdrpou);
      
      // Find counterparty in "Основні дані"
      const response = await axios.get(`${API}/counterparties`);
      console.log('Counterparties response:', response.data);
      
      const counterparty = response.data.find(c => c.edrpou === actCounterpartyEdrpou);
      console.log('Found counterparty:', counterparty);
      
      if (!counterparty) {
        toast.error('Контрагента не знайдено');
        setActFoundCounterparty(null);
        setActAvailableOrders([]);
        setActAvailableContracts([]);
        return;
      }
      
      setActFoundCounterparty(counterparty);
      toast.success(`Знайдено: ${counterparty.name}`);
      
      // Fetch all orders for this counterparty
      console.log('Fetching orders...');
      const ordersResponse = await axios.get(`${API}/orders`);
      console.log('Orders response:', ordersResponse.data);
      
      const counterpartyOrders = ordersResponse.data.filter(
        order => order.counterparty_edrpou === actCounterpartyEdrpou
      );
      console.log('Filtered orders:', counterpartyOrders.length);
      setActAvailableOrders(counterpartyOrders);
      
      // Fetch all contracts for this counterparty
      console.log('Fetching contracts...');
      const contractsResponse = await axios.get(`${API}/contracts`);
      console.log('Contracts response:', contractsResponse.data);
      
      const counterpartyContracts = contractsResponse.data.filter(
        contract => contract.counterparty_edrpou === actCounterpartyEdrpou
      );
      console.log('Filtered contracts:', counterpartyContracts.length);
      setActAvailableContracts(counterpartyContracts);
      
    } catch (error) {
      console.error('Error searching act counterparty:', error);
      toast.error('Помилка при пошуку контрагента: ' + (error.response?.data?.detail || error.message));
      setActFoundCounterparty(null);
      setActAvailableOrders([]);
      setActAvailableContracts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleActOrder = (orderNumber) => {
    setActSelectedOrders(prev => {
      if (prev.includes(orderNumber)) {
        return prev.filter(n => n !== orderNumber);
      } else {
        return [...prev, orderNumber];
      }
    });
  };
  
  const toggleContractOrder = (orderNumber) => {
    setContractSelectedOrders(prev => {
      if (prev.includes(orderNumber)) {
        return prev.filter(n => n !== orderNumber);
      } else {
        return [...prev, orderNumber];
      }
    });
  };
  
  const handleActFromOrdersSubmit = async () => {
    if (!actFoundCounterparty) {
      toast.error('Спочатку знайдіть контрагента');
      return;
    }
    
    if (actType === 'with-orders' && actSelectedOrders.length === 0) {
      toast.error('Оберіть хоча б одне замовлення');
      return;
    }
    
    setLoading(true);
    try {
      // Get selected contract details if any
      let contractNumber = '';
      let contractDate = '';
      
      if (actSelectedContract) {
        const contract = actAvailableContracts.find(c => c.number === actSelectedContract);
        if (contract) {
          contractNumber = contract.number;
          contractDate = contract.date;
        }
      }
      
      const payload = {
        counterparty_edrpou: actCounterpartyEdrpou,
        order_numbers: actSelectedOrders,
        contract_number: contractNumber || null,
        contract_date: contractDate || null
        // НЕ передаємо custom_template - використовуємо дефолтний з backend
      };
      
      const response = await axios.post(`${API}/acts/generate-from-orders`, payload);
      
      if (response.data.success) {
        toast.success('Акт успішно згенеровано на основі замовлень!');
        
        // Get counterparty email
        let counterpartyEmail = actFoundCounterparty?.email || '';
        
        // If no drive_file_id, fetch PDF as blob
        if (!response.data.drive_file_id) {
          try {
            const actNumber = response.data.act_number;
            const localPdfUrl = `${API}/acts/pdf/${actNumber}`;
            
            const pdfResponse = await axios.get(localPdfUrl, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(pdfResponse.data);
            
            setDocumentPdfData({
              drive_view_link: blobUrl,
              drive_download_link: localPdfUrl,
              drive_file_id: '',
              act_number: actNumber,
              is_blob: true
            });
          } catch (blobError) {
            console.error('Error loading act PDF blob:', blobError);
            setDocumentPdfData({
              drive_view_link: response.data.drive_view_link,
              drive_download_link: response.data.drive_download_link,
              drive_file_id: response.data.drive_file_id,
              pdf_filename: response.data.pdf_filename,
              act_number: response.data.act_number
            });
          }
        } else {
          setDocumentPdfData({
            drive_view_link: response.data.drive_view_link,
            drive_download_link: response.data.drive_download_link,
            drive_file_id: response.data.drive_file_id,
            pdf_filename: response.data.pdf_filename,
            act_number: response.data.act_number
          });
        }
        
        // Set email form with counterparty email
        setDocumentEmailForm({
          recipient: 'counterparty',
          customEmail: '',
          counterpartyEmail: counterpartyEmail
        });
        
        setCurrentDocType('act');
        setShowDocumentPreview(true);
        
        // Reset form
        setActType('without-orders');
        setActCounterpartyEdrpou('');
        setActFoundCounterparty(null);
        setActAvailableOrders([]);
        setActSelectedOrders([]);
        setActAvailableContracts([]);
        setActSelectedContract('');
        
        // Refresh documents
        fetchAllDocuments();
      }
    } catch (error) {
      console.error('Error generating act from orders:', error);
      toast.error('Помилка при генерації акту: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const handleContractFromOrderSubmit = async () => {
    if (!foundCounterparty) {
      toast.error('Спочатку знайдіть контрагента');
      return;
    }
    
    if (!contractSelectedOrder) {
      toast.error('Оберіть замовлення');
      return;
    }
    
    setLoading(true);
    try {
      // Find selected order data
      const selectedOrder = contractAvailableOrders.find(o => o.number === contractSelectedOrder);
      
      if (!selectedOrder) {
        toast.error('Замовлення не знайдено');
        setLoading(false);
        return;
      }
      
      const payload = {
        counterparty_edrpou: searchEdrpou,
        subject: contractForm.subject || `Договір на основі замовлення №${contractSelectedOrder}`,
        items: selectedOrder.items || [],
        total_amount: contractForm.amount || selectedOrder.total_amount || 0,
        custom_template: contractTemplate || null,
        template_settings: templateSettings,
        based_on_order: contractSelectedOrder
      };
      
      const pdfResponse = await axios.post(`${API}/contracts/generate-pdf`, payload);
      
      if (pdfResponse.data.success) {
        // If no drive_file_id, fetch PDF as blob from local storage
        if (!pdfResponse.data.drive_file_id || pdfResponse.data.drive_file_id === '') {
          try {
            const contractNumber = pdfResponse.data.contract_number;
            const localPdfUrl = `${API}/contracts/pdf/${contractNumber}`;
            
            const pdfBlob = await axios.get(localPdfUrl, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(pdfBlob.data);
            
            setContractPdfData({
              drive_view_link: blobUrl,
              drive_download_link: localPdfUrl,
              drive_file_id: '',
              contract_number: contractNumber,
              is_blob: true,
              counterpartyEmail: foundCounterparty?.email || ''
            });
          } catch (blobError) {
            console.error('Error loading contract PDF blob:', blobError);
            setContractPdfData({
              ...pdfResponse.data,
              counterpartyEmail: foundCounterparty?.email || ''
            });
          }
        } else {
          setContractPdfData({
            ...pdfResponse.data,
            counterpartyEmail: foundCounterparty?.email || ''
          });
        }
        
        setContractEmailForm({
          recipient: 'counterparty',
          customEmail: '',
          counterpartyEmail: foundCounterparty?.email || ''
        });
        
        setTimeout(() => {
          setShowContractPreview(true);
          toast.success('Договір успішно згенеровано на основі замовлення!');
          fetchAllDocuments();
          
          // Reset
          setContractForm({
            subject: '',
            amount: 0,
            items: []
          });
          setSearchEdrpou('');
          setFoundCounterparty(null);
          setContractBasedOnOrder(false);
          setContractAvailableOrders([]);
          setContractSelectedOrder('');
        }, 100);
      }
    } catch (error) {
      console.error('Contract generation from order error:', error);
      toast.error(error.response?.data?.detail || 'Помилка при створенні договору на основі замовлення');
    } finally {
      setLoading(false);
    }
  };
  
  const viewCounterpartyDetails = async (edrpou) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/counterparties/${edrpou}`);
      setSelectedCounterparty(response.data);
      
      const docsResponse = await axios.get(`${API}/counterparties/${edrpou}/documents`);
      setCounterpartyDocuments(docsResponse.data);
    } catch (error) {
      toast.error('Помилка завантаження даних контрагента');
    } finally {
      setLoading(false);
    }
  };

  const refreshCounterpartyDocuments = async () => {
    if (!selectedCounterparty?.edrpou) {
      toast.error('Контрагент не обраний');
      return;
    }
    
    try {
      const docsResponse = await axios.get(`${API}/counterparties/${selectedCounterparty.edrpou}/documents`);
      setCounterpartyDocuments(docsResponse.data);
      toast.success('Список документів оновлено');
    } catch (error) {
      toast.error('Помилка оновлення документів');
    }
  };
  
  const handleCreateDocFromCounterparty = (docType) => {
    setDocTypeToCreate(docType);
    setDocumentForm({
      counterparty_edrpou: selectedCounterparty.edrpou,
      items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
      total_amount: 0
    });
    setShowDocCreateDialog(true);
  };

  const handleCounterpartySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/counterparties`, counterpartyForm);
      toast.success(response.data.message || 'Контрагента успішно створено!');
      setCounterpartyForm({
        edrpou: '',
        representative_name: '',
        email: '',
        phone: '',
        iban: '',
        contract_type: 'Класичний',
        director_position: '',
        director_name: ''
      });
      fetchCounterparties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка при створенні контрагента');
    } finally {
      setLoading(false);
    }
  };

  const searchCounterparty = async () => {
    if (!searchEdrpou) {
      toast.error('Введіть код ЄДРПОУ');
      return;
    }

    try {
      const response = await axios.get(`${API}/counterparties/${searchEdrpou}`);
      setFoundCounterparty(response.data);
      setDocumentForm(prev => ({
        ...prev,
        counterparty_edrpou: searchEdrpou
      }));
      toast.success(`Знайдено: ${response.data.representative_name}`);
      
      // Fetch available orders for this counterparty (for contracts based on orders)
      try {
        const ordersResponse = await axios.get(`${API}/orders`);
        const counterpartyOrders = ordersResponse.data.filter(
          order => order.counterparty_edrpou === searchEdrpou
        );
        setContractAvailableOrders(counterpartyOrders);
      } catch (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setContractAvailableOrders([]);
      }
    } catch (error) {
      toast.error('Контрагента не знайдено');
      setFoundCounterparty(null);
      setContractAvailableOrders([]);
    }
  };

  const addItem = () => {
    setDocumentForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', unit: '', quantity: 0, price: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    setDocumentForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const totalAmount = newItems.reduce((sum, item) => sum + item.amount, 0);
      return {
        ...prev,
        items: newItems,
        total_amount: totalAmount
      };
    });
  };

  const updateItem = (index, field, value) => {
    setDocumentForm(prev => {
      const newItems = [...prev.items];
      newItems[index][field] = value;
      
      if (field === 'quantity' || field === 'price') {
        const quantity = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].price) || 0;
        newItems[index].amount = quantity * price;
      }
      
      const totalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      return {
        ...prev,
        items: newItems,
        total_amount: totalAmount
      };
    });
  };

  const handleDocumentSubmit = async (e, endpoint, docType) => {
    e.preventDefault();
    setLoading(true);
    
    if (!documentForm.counterparty_edrpou) {
      toast.error('Спочатку знайдіть контрагента');
      setLoading(false);
      return;
    }

    try {
      if (['orders', 'invoices', 'acts', 'waybills'].includes(endpoint)) {
        // Generate PDF for orders, invoices, acts, and waybills
        const payload = { ...documentForm };
        
        // Add custom template for orders if available
        if (endpoint === 'orders' && orderTemplate && orderTemplate.trim() !== '') {
          payload.custom_template = orderTemplate;
        }
        
        const response = await axios.post(`${API}/${endpoint}/generate-pdf`, payload);
        
        if (response.data.success) {
          // Set current document type for proper labeling
          let docTypeKey = 'invoice';
          if (endpoint === 'orders') docTypeKey = 'order';
          if (endpoint === 'acts') docTypeKey = 'act';
          if (endpoint === 'waybills') docTypeKey = 'waybill';
          
          setCurrentDocType(docTypeKey);
          
          // For orders, save the form data for creating other documents
          if (endpoint === 'orders') {
            // If no drive_file_id (Drive not working), fetch PDF as blob for preview
            if (!response.data.drive_file_id) {
              const localPdfUrl = `${API}/orders/pdf/${response.data.order_number}`;
              
              try {
                // Fetch PDF as blob
                const pdfResponse = await axios.get(localPdfUrl, {
                  responseType: 'blob'
                });
                
                // Create blob URL for iframe
                const blobUrl = URL.createObjectURL(pdfResponse.data);
                
                const orderPdfData = {
                  drive_view_link: blobUrl,
                  drive_download_link: localPdfUrl,
                  drive_file_id: '',
                  order_number: response.data.order_number,
                  pdf_path: response.data.pdf_path,
                  is_blob: true,
                  order_form_data: {
                    counterparty_edrpou: documentForm.counterparty_edrpou,
                    items: documentForm.items,
                    total_amount: documentForm.total_amount
                  }
                };
                console.log('Saving order PDF data with blob:', orderPdfData);
                setDocumentPdfData(orderPdfData);
              } catch (blobError) {
                console.error('Error loading PDF blob:', blobError);
                // Fallback: set data without blob
                const orderPdfData = {
                  ...response.data,
                  order_form_data: {
                    counterparty_edrpou: documentForm.counterparty_edrpou,
                    items: documentForm.items,
                    total_amount: documentForm.total_amount
                  }
                };
                setDocumentPdfData(orderPdfData);
              }
            } else {
              // With Drive file ID
              const orderPdfData = {
                ...response.data,
                order_form_data: {
                  counterparty_edrpou: documentForm.counterparty_edrpou,
                  items: documentForm.items,
                  total_amount: documentForm.total_amount
                }
              };
              console.log('Saving order PDF data:', orderPdfData);
              setDocumentPdfData(orderPdfData);
            }
          } else {
            setDocumentPdfData(response.data);
          }
          
          setDocumentEmailForm({
            recipient: 'counterparty',
            customEmail: '',
            counterpartyEmail: foundCounterparty?.email || ''
          });
          setShowDocumentPreview(true);
          
          toast.success(response.data.message || `${docType} успішно створено!`);
          
          // Refresh all documents list
          fetchAllDocuments();
          
          // Refresh documents if viewing a counterparty
          if (selectedCounterparty) {
            const docsResponse = await axios.get(`${API}/counterparties/${selectedCounterparty.edrpou}/documents`);
            setCounterpartyDocuments(docsResponse.data);
          }
        }
      } else if (false) {
        // Generate PDF for invoices, acts, and waybills
        const response = await axios.post(`${API}/${endpoint}/generate-pdf`, documentForm);
        
        if (response.data.success) {
          // Set current document type for proper labeling
          let docTypeKey = 'invoice';
          if (endpoint === 'acts') docTypeKey = 'act';
          if (endpoint === 'waybills') docTypeKey = 'waybill';
          
          setCurrentDocType(docTypeKey);
          setDocumentPdfData(response.data);
          setDocumentEmailForm({
            recipient: 'counterparty',
            customEmail: '',
            counterpartyEmail: foundCounterparty?.email || ''
          });
          setShowDocumentPreview(true);
          
          toast.success(response.data.message || `${docType} успішно створено!`);
          
          // Refresh all documents list
          fetchAllDocuments();
          
          // Refresh documents if viewing a counterparty
          if (selectedCounterparty) {
            const docsResponse = await axios.get(`${API}/counterparties/${selectedCounterparty.edrpou}/documents`);
            setCounterpartyDocuments(docsResponse.data);
          }
        }
      } else {
        // Original logic for other document types
        const response = await axios.post(`${API}/${endpoint}`, documentForm);
        toast.success(response.data.message || `${docType} успішно створено!`);
        
        setDocumentForm({
          counterparty_edrpou: '',
          items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
          total_amount: 0
        });
        setSearchEdrpou('');
        setFoundCounterparty(null);
        setShowDocCreateDialog(false);
        
        if (selectedCounterparty) {
          const docsResponse = await axios.get(`${API}/counterparties/${selectedCounterparty.edrpou}/documents`);
          setCounterpartyDocuments(docsResponse.data);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Помилка при створенні ${docType}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateDocumentsFromOrder = async () => {
    if (!orderData) return;
    
    setLoading(true);
    let successCount = 0;
    const errors = [];
    
    try {
      // Order is already created, just check if we need to keep it
      if (selectedDocs.order) {
        successCount++; // Count the order itself
      }
      
      // Create invoice
      if (selectedDocs.invoice) {
        try {
          await axios.post(`${API}/invoices`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Рахунок');
        }
      }
      
      // Create act
      if (selectedDocs.act) {
        try {
          await axios.post(`${API}/acts`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Акт');
        }
      }
      
      // Create waybill
      if (selectedDocs.waybill) {
        try {
          await axios.post(`${API}/waybills`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Видаткова накладна');
        }
      }
      
      // Create contract
      if (selectedDocs.contract) {
        try {
          await axios.post(`${API}/contracts`, {
            counterparty_edrpou: orderData.counterparty_edrpou,
            subject: contractForm.subject,
            amount: contractForm.amount || orderData.total_amount
          });
          successCount++;
        } catch (e) {
          errors.push('Договір');
        }
      }
      
      if (successCount > 0) {
        toast.success(`Успішно створено ${successCount} документ(ів)!`);
      }
      
      if (errors.length > 0) {
        toast.error(`Помилка при створенні: ${errors.join(', ')}`);
      }
      
      setShowOrderDialog(false);
      setOrderData(null);
      setSelectedDocs({
        order: true,
        invoice: false,
        act: false,
        waybill: false,
        contract: false
      });
      setContractForm({ subject: '', amount: 0 });
      setDocumentForm({
        counterparty_edrpou: '',
        items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
        total_amount: 0
      });
      setSearchEdrpou('');
      setFoundCounterparty(null);
      
    } catch (error) {
      toast.error('Помилка при створенні документів');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App min-h-screen">
      <Toaster position="top-right" richColors />
      
      <header className="header-gradient border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="icon-wrapper">
              <FileText className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800" data-testid="app-title">
                Система Управління Документами
              </h1>
              <p className="text-sm text-gray-600 mt-1" data-testid="app-subtitle">
                Управління контрагентами та документами
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="counterparties" className="w-full" data-testid="main-tabs">
          <TabsList className="tabs-list grid w-full grid-cols-3 sm:grid-cols-6 mb-8">
            <TabsTrigger value="counterparties" data-testid="tab-counterparties">
              <Users className="w-4 h-4 mr-2" />
              Контрагенти
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="w-4 h-4 mr-2" />
              Замовлення
            </TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <Receipt className="w-4 h-4 mr-2" />
              Рахунки
            </TabsTrigger>
            <TabsTrigger value="acts" data-testid="tab-acts">
              <FileText className="w-4 h-4 mr-2" />
              Акти
            </TabsTrigger>
            <TabsTrigger value="waybills" data-testid="tab-waybills">
              <FileText className="w-4 h-4 mr-2" />
              Видаткові
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <FileSignature className="w-4 h-4 mr-2" />
              Договори
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counterparties" data-testid="counterparties-content">
            {!selectedCounterparty ? (
              <>
                {/* Search Section */}
                <Card className="glass-card mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl">Пошук контрагента</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        data-testid="counterparty-search-input"
                        value={searchCounterpartyEdrpou}
                        onChange={(e) => setSearchCounterpartyEdrpou(e.target.value)}
                        placeholder="Введіть код ЄДРПОУ"
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && searchAndViewCounterparty()}
                      />
                      <Button 
                        onClick={searchAndViewCounterparty}
                        disabled={loading}
                        data-testid="search-and-view-btn"
                        className="btn-primary"
                      >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Знайти
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-2xl" data-testid="counterparty-form-title">Створення Контрагента</CardTitle>
                    <CardDescription data-testid="counterparty-form-description">Додайте нового контрагента до системи</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCounterpartySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edrpou">Код ЄДРПОУ *</Label>
                          <Input
                            id="edrpou"
                            value={counterpartyForm.edrpou}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, edrpou: e.target.value})}
                            placeholder="12345678"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="representative_name">Ім'я Представника *</Label>
                          <Input
                            id="representative_name"
                            value={counterpartyForm.representative_name}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, representative_name: e.target.value})}
                            placeholder="Іван Петренко"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="director_position">Посада керівника</Label>
                          <Input
                            id="director_position"
                            value={counterpartyForm.director_position}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, director_position: e.target.value})}
                            placeholder="Генеральний директор"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="director_name">ПІБ керівника</Label>
                          <Input
                            id="director_name"
                            value={counterpartyForm.director_name}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, director_name: e.target.value})}
                            placeholder="Петренко Іван Олександрович"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={counterpartyForm.email}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, email: e.target.value})}
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Телефон *</Label>
                          <Input
                            id="phone"
                            value={counterpartyForm.phone}
                            onChange={(e) => setCounterpartyForm({...counterpartyForm, phone: e.target.value})}
                            placeholder="+380XXXXXXXXX"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="iban">IBAN *</Label>
                        <Input
                          id="iban"
                          value={counterpartyForm.iban}
                          onChange={(e) => setCounterpartyForm({...counterpartyForm, iban: e.target.value})}
                          placeholder="UA123456789012345678901234567"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contract_type">Тип Договору *</Label>
                        <Select
                          value={counterpartyForm.contract_type}
                          onValueChange={(value) => setCounterpartyForm({...counterpartyForm, contract_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Оберіть тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Класичний">Класичний</SelectItem>
                            <SelectItem value="Некласичний">Некласичний</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full btn-primary py-6 text-lg"
                      >
                        {loading ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Створення...</>
                        ) : (
                          'Створити Контрагента'
                        )}
                      </Button>
                    </form>

                    {counterparties.length > 0 && (
                      <div className="mt-8 space-y-3">
                        <h3 className="text-lg font-semibold">Список Контрагентів ({counterparties.length})</h3>
                        <div className="grid gap-3">
                          {counterparties.map((cp, index) => (
                            <div key={index} className="counterparty-card p-4 cursor-pointer" onClick={() => viewCounterpartyDetails(cp.edrpou)}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-lg">{cp.representative_name}</p>
                                  <p className="text-sm text-gray-600">ЄДРПОУ: {cp.edrpou}</p>
                                  <p className="text-sm text-gray-600">{cp.email} | {cp.phone}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="contract-badge">{cp.contract_type}</span>
                                  <Eye className="w-5 h-5 text-teal-600" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Counterparty Details View */
              <div className="space-y-6">
                <Button 
                  onClick={() => {
                    setSelectedCounterparty(null);
                    setCounterpartyDocuments(null);
                    setSearchCounterpartyEdrpou('');
                  }}
                  variant="outline"
                  className="mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад до списку
                </Button>
                
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-2xl">Картка Контрагента</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">ЄДРПОУ</Label>
                        <p className="text-lg font-semibold">{selectedCounterparty.edrpou}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Назва</Label>
                        <p className="text-lg font-semibold">{selectedCounterparty.representative_name}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">Юридична адреса</Label>
                        <p className="text-lg">{selectedCounterparty.legal_address || 'Не вказано'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">р/р (IBAN)</Label>
                        <p className="text-lg font-mono">{selectedCounterparty.iban}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Банк</Label>
                        <p className="text-lg">{selectedCounterparty.bank || 'Не вказано'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">МФО</Label>
                        <p className="text-lg">{selectedCounterparty.mfo || 'Не вказано'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Email</Label>
                        <p className="text-lg">{selectedCounterparty.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Телефон</Label>
                        <p className="text-lg">{selectedCounterparty.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Посада</Label>
                        <p className="text-lg">{selectedCounterparty.position || 'Не вказано'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">В особі</Label>
                        <p className="text-lg">{selectedCounterparty.represented_by || 'Не вказано'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">Підпис</Label>
                        <p className="text-lg">{selectedCounterparty.signature || 'Не вказано'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-3">Створити документ</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Button onClick={() => handleCreateDocFromCounterparty('orders')} className="btn-secondary">
                          <Package className="w-4 h-4 mr-2" />
                          Замовлення
                        </Button>
                        <Button onClick={() => handleCreateDocFromCounterparty('invoices')} className="btn-secondary">
                          <Receipt className="w-4 h-4 mr-2" />
                          Рахунок
                        </Button>
                        <Button onClick={() => handleCreateDocFromCounterparty('acts')} className="btn-secondary">
                          <FileText className="w-4 h-4 mr-2" />
                          Акт
                        </Button>
                        <Button onClick={() => handleCreateDocFromCounterparty('waybills')} className="btn-secondary">
                          <FileText className="w-4 h-4 mr-2" />
                          Накладна
                        </Button>
                        <Button onClick={() => handleCreateDocFromCounterparty('contracts')} className="btn-secondary">
                          <FileSignature className="w-4 h-4 mr-2" />
                          Договір
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {counterpartyDocuments && (
                  <Card className="glass-card">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">Документи контрагента</CardTitle>
                        <Button
                          onClick={refreshCounterpartyDocuments}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Оновити
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {counterpartyDocuments.orders?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Замовлення ({counterpartyDocuments.orders.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.orders.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
                                  {doc.drive_file_id && (
                                    <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (doc.drive_file_id && doc.drive_file_id !== '') {
                                      setDocumentPdfData({
                                        drive_file_id: doc.drive_file_id,
                                        drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                        drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                        order_number: doc.number,
                                        order_form_data: {
                                          counterparty_edrpou: selectedCounterparty?.edrpou || '',
                                          items: doc.items || [],
                                          total_amount: parseFloat(doc.total_amount) || 0
                                        }
                                      });
                                      setCurrentDocType('order');
                                      setShowDocumentPreview(true);
                                    } else {
                                      toast.error('Документ ще не завантажено на Google Drive');
                                    }
                                  }}
                                  className="btn-secondary ml-2"
                                  disabled={!doc.drive_file_id || doc.drive_file_id === ''}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Переглянути
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {counterpartyDocuments.invoices?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Рахунки ({counterpartyDocuments.invoices.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.invoices.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-green-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
                                  {doc.drive_file_id && (
                                    <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (doc.drive_file_id && doc.drive_file_id !== '') {
                                      setDocumentPdfData({
                                        drive_file_id: doc.drive_file_id,
                                        drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                        drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                        invoice_number: doc.number
                                      });
                                      setCurrentDocType('invoice');
                                      setShowDocumentPreview(true);
                                    } else {
                                      toast.error('Документ ще не завантажено на Google Drive');
                                    }
                                  }}
                                  className="btn-secondary ml-2"
                                  disabled={!doc.drive_file_id || doc.drive_file_id === ''}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Переглянути
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {counterpartyDocuments.acts?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Акти ({counterpartyDocuments.acts.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.acts.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-purple-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
                                  {doc.drive_file_id && (
                                    <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (doc.drive_file_id && doc.drive_file_id !== '') {
                                      setDocumentPdfData({
                                        drive_file_id: doc.drive_file_id,
                                        drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                        drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                        act_number: doc.number
                                      });
                                      setCurrentDocType('act');
                                      setShowDocumentPreview(true);
                                    } else {
                                      toast.error('Документ ще не завантажено на Google Drive');
                                    }
                                  }}
                                  className="btn-secondary ml-2"
                                  disabled={!doc.drive_file_id || doc.drive_file_id === ''}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Переглянути
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {counterpartyDocuments.waybills?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Видаткові накладні ({counterpartyDocuments.waybills.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.waybills.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-orange-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
                                  {doc.drive_file_id && (
                                    <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (doc.drive_file_id && doc.drive_file_id !== '') {
                                      setDocumentPdfData({
                                        drive_file_id: doc.drive_file_id,
                                        drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                        drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                        waybill_number: doc.number
                                      });
                                      setCurrentDocType('waybill');
                                      setShowDocumentPreview(true);
                                    } else {
                                      toast.error('Документ ще не завантажено на Google Drive');
                                    }
                                  }}
                                  className="btn-secondary ml-2"
                                  disabled={!doc.drive_file_id || doc.drive_file_id === ''}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Переглянути
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {counterpartyDocuments.contracts?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Договори ({counterpartyDocuments.contracts.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.contracts.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-teal-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="text-sm">№{doc.number} від {doc.date} | {doc.subject} | Сума: {doc.amount} грн</p>
                                  {doc.drive_file_id && (
                                    <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (doc.drive_file_id && doc.drive_file_id !== '') {
                                      setContractPdfData({
                                        drive_file_id: doc.drive_file_id,
                                        drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                        drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                        contract_number: doc.number
                                      });
                                      setContractEmailForm({
                                        recipient: 'counterparty',
                                        customEmail: '',
                                        counterpartyEmail: selectedCounterparty?.email || ''
                                      });
                                      setShowContractPreview(true);
                                    } else {
                                      toast.error('Документ ще не завантажено на Google Drive');
                                    }
                                  }}
                                  className="btn-secondary ml-2"
                                  disabled={!doc.drive_file_id || doc.drive_file_id === ''}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Переглянути
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!counterpartyDocuments.orders?.length && 
                       !counterpartyDocuments.invoices?.length && 
                       !counterpartyDocuments.acts?.length && 
                       !counterpartyDocuments.waybills?.length && 
                       !counterpartyDocuments.contracts?.length && (
                        <p className="text-gray-500 text-center py-4">Документів поки немає</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" data-testid="orders-content">
            {/* Template Editor Button */}
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowOrderTemplateEditor(true)}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Редагувати шаблон замовлення
              </Button>
            </div>

            <DocumentForm 
              endpoint="orders" 
              docType="Замовлення" 
              title="Створення Замовлення"
              searchEdrpou={searchEdrpou}
              setSearchEdrpou={setSearchEdrpou}
              foundCounterparty={foundCounterparty}
              searchCounterparty={searchCounterparty}
              documentForm={documentForm}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              handleDocumentSubmit={handleDocumentSubmit}
              loading={loading}
            />
            
            {/* List of all orders */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Всі замовлення ({allOrders.length})</CardTitle>
                    <CardDescription>Останні створені замовлення</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAllDocuments()}
                    disabled={loading}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Оновлення...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" /> Оновити</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allOrders.length > 0 ? (
                  <div className="space-y-3">
                    {allOrders.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-gray-900">Замовлення №{doc.number}</p>
                          <p className="text-sm text-gray-600">від {doc.date}</p>
                          <p className="text-sm text-gray-700 mt-1">{doc.counterparty_name}</p>
                          <p className="text-sm font-medium text-blue-700 mt-1">Сума: {doc.total_amount} грн</p>
                          {doc.drive_file_id && (
                            <p className="text-xs text-gray-500 mt-1">ID: {doc.drive_file_id}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setCurrentOrderDetails(doc);
                              setSelectedOrderData({
                                counterparty_edrpou: doc.counterparty_edrpou || '',
                                items: doc.items || [],
                                total_amount: parseFloat(doc.total_amount) || 0,
                                order_number: doc.number
                              });
                              setShowOrderDetails(true);
                              // Load related documents
                              await loadOrderRelatedDocuments(doc.number);
                            }}
                            className="btn-secondary"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Відкрити
                          </Button>
                          
                          {doc.drive_file_id && doc.drive_file_id !== '' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDocumentPdfData({
                                  drive_file_id: doc.drive_file_id,
                                  drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                  drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                  order_number: doc.number,
                                  order_form_data: {
                                    counterparty_edrpou: doc.counterparty_edrpou || '',
                                    items: doc.items || [],
                                    total_amount: parseFloat(doc.total_amount) || 0
                                  }
                                });
                                setCurrentDocType('order');
                                setShowDocumentPreview(true);
                              }}
                              className="btn-primary"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Замовлень поки немає</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" data-testid="invoices-content">
            <DocumentForm 
              endpoint="invoices" 
              docType="Рахунок" 
              title="Створення Рахунку"
              searchEdrpou={searchEdrpou}
              setSearchEdrpou={setSearchEdrpou}
              foundCounterparty={foundCounterparty}
              searchCounterparty={searchCounterparty}
              documentForm={documentForm}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              handleDocumentSubmit={handleDocumentSubmit}
              loading={loading}
            />
            
            {/* List of all invoices */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Всі рахунки ({allInvoices.length})</CardTitle>
                <CardDescription>Останні створені рахунки</CardDescription>
              </CardHeader>
              <CardContent>
                {allInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {allInvoices.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-gray-900">Рахунок №{doc.number}</p>
                          <p className="text-sm text-gray-600">від {doc.date}</p>
                          <p className="text-sm text-gray-700 mt-1">{doc.counterparty_name}</p>
                          <p className="text-sm font-medium text-green-700 mt-1">Сума: {doc.total_amount} грн</p>
                        </div>
                        {doc.drive_file_id && doc.drive_file_id !== '' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDocumentPdfData({
                                drive_file_id: doc.drive_file_id,
                                drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                invoice_number: doc.number
                              });
                              setCurrentDocType('invoice');
                              setShowDocumentPreview(true);
                            }}
                            className="btn-secondary"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Переглянути
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Рахунків поки немає</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acts" data-testid="acts-content">
            {/* Act Template Editor Button */}
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowActTemplateEditor(true)}
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Редагувати шаблон акту
              </Button>
            </div>
            
            {/* New Act Creation UI */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Створення Акту Наданих Послуг</CardTitle>
                <CardDescription>Оберіть контрагента та тип акту</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Search Counterparty */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Крок 1: Пошук контрагента</Label>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Введіть ЄДРПОУ контрагента"
                      value={actCounterpartyEdrpou}
                      onChange={(e) => setActCounterpartyEdrpou(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={searchActCounterparty}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      Пошук
                    </Button>
                  </div>
                  
                  {actFoundCounterparty && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-900">✓ Знайдено контрагента:</p>
                      <p className="text-sm text-green-700">{actFoundCounterparty.representative_name || actFoundCounterparty.name}</p>
                      <p className="text-xs text-green-600">ЄДРПОУ: {actFoundCounterparty.edrpou}</p>
                    </div>
                  )}
                </div>
                
                {/* Step 2: Select Act Type */}
                {actFoundCounterparty && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Крок 2: Тип акту</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="without-orders"
                          name="actType"
                          value="without-orders"
                          checked={actType === 'without-orders'}
                          onChange={(e) => setActType(e.target.value)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <label htmlFor="without-orders" className="text-sm cursor-pointer">
                          Акт без замовлення (введу дані вручну)
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="with-orders"
                          name="actType"
                          value="with-orders"
                          checked={actType === 'with-orders'}
                          onChange={(e) => setActType(e.target.value)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <label htmlFor="with-orders" className="text-sm cursor-pointer">
                          Акт на основі замовлень ({actAvailableOrders.length} доступно)
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Select Orders (if with-orders) */}
                {actFoundCounterparty && actType === 'with-orders' && (
                  <>
                    {/* Optional: Select Contract */}
                    {actAvailableContracts.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Крок 3 (опціонально): Оберіть договір</Label>
                        <select
                          value={actSelectedContract}
                          onChange={(e) => setActSelectedContract(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Без договору</option>
                          {actAvailableContracts.map(contract => (
                            <option key={contract.number} value={contract.number}>
                              Договір № {contract.number} від {contract.date}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Select Orders */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Крок {actAvailableContracts.length > 0 ? '4' : '3'}: Оберіть замовлення ({actSelectedOrders.length} обрано)
                      </Label>
                      
                      {actAvailableOrders.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {actAvailableOrders.map(order => (
                            <div 
                              key={order.number}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                actSelectedOrders.includes(order.number)
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                              onClick={() => toggleActOrder(order.number)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={actSelectedOrders.includes(order.number)}
                                    onChange={() => toggleActOrder(order.number)}
                                    className="mt-1 w-4 h-4 text-purple-600"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Замовлення № {order.number}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Дата: {order.date} | Сума: {order.total_amount} грн
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Позицій: {order.items ? order.items.length : 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Немає замовлень для цього контрагента
                        </p>
                      )}
                    </div>
                    
                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleActFromOrdersSubmit}
                        disabled={loading || actSelectedOrders.length === 0}
                        className="w-full btn-primary"
                      >
                        {loading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерація...</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-2" /> Згенерувати акт на основі замовлень</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
                
                {/* Manual Act Creation (without orders) */}
                {actFoundCounterparty && actType === 'without-orders' && (
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Для створення акту без замовлення використовуйте стару форму нижче.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Old DocumentForm for manual act creation */}
            {actFoundCounterparty && actType === 'without-orders' && (
              <Card className="glass-card mt-6">
                <CardHeader>
                  <CardTitle>Ручне введення даних акту</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentForm 
                    endpoint="acts" 
                    docType="Акт" 
                    title="Створення Акту Виконаних Робіт"
                    searchEdrpou={searchEdrpou}
                    setSearchEdrpou={setSearchEdrpou}
                    foundCounterparty={foundCounterparty}
                    searchCounterparty={searchCounterparty}
                    documentForm={documentForm}
                    addItem={addItem}
                    removeItem={removeItem}
                    updateItem={updateItem}
                    handleDocumentSubmit={handleDocumentSubmit}
                    loading={loading}
                  />
                </CardContent>
              </Card>
            )}
            
            
            {/* List of all acts */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Всі акти ({allActs.length})</CardTitle>
                <CardDescription>Останні створені акти виконаних робіт</CardDescription>
              </CardHeader>
              <CardContent>
                {allActs.length > 0 ? (
                  <div className="space-y-3">
                    {allActs.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-gray-900">Акт №{doc.number}</p>
                          <p className="text-sm text-gray-600">від {doc.date}</p>
                          <p className="text-sm text-gray-700 mt-1">{doc.counterparty_name}</p>
                          <p className="text-sm font-medium text-purple-700 mt-1">Сума: {doc.total_amount} грн</p>
                        </div>
                        {doc.drive_file_id && doc.drive_file_id !== '' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDocumentPdfData({
                                drive_file_id: doc.drive_file_id,
                                drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                act_number: doc.number
                              });
                              setCurrentDocType('act');
                              setShowDocumentPreview(true);
                            }}
                            className="btn-secondary"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Переглянути
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Актів поки немає</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waybills" data-testid="waybills-content">
            <DocumentForm 
              endpoint="waybills" 
              docType="Видаткова Накладна" 
              title="Створення Видаткової Накладної"
              searchEdrpou={searchEdrpou}
              setSearchEdrpou={setSearchEdrpou}
              foundCounterparty={foundCounterparty}
              searchCounterparty={searchCounterparty}
              documentForm={documentForm}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              handleDocumentSubmit={handleDocumentSubmit}
              loading={loading}
            />
            
            {/* List of all waybills */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Всі накладні ({allWaybills.length})</CardTitle>
                <CardDescription>Останні створені видаткові накладні</CardDescription>
              </CardHeader>
              <CardContent>
                {allWaybills.length > 0 ? (
                  <div className="space-y-3">
                    {allWaybills.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-gray-900">Накладна №{doc.number}</p>
                          <p className="text-sm text-gray-600">від {doc.date}</p>
                          <p className="text-sm text-gray-700 mt-1">{doc.counterparty_name}</p>
                          <p className="text-sm font-medium text-orange-700 mt-1">Сума: {doc.total_amount} грн</p>
                        </div>
                        {doc.drive_file_id && doc.drive_file_id !== '' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDocumentPdfData({
                                drive_file_id: doc.drive_file_id,
                                drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                waybill_number: doc.number
                              });
                              setCurrentDocType('waybill');
                              setShowDocumentPreview(true);
                            }}
                            className="btn-secondary"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Переглянути
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Накладних поки немає</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" data-testid="contracts-content">
            {/* Template Editor Button */}
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowTemplateEditor(true)}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Редагувати шаблон договору
              </Button>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl">Створення Договору</CardTitle>
                <CardDescription>Створіть новий договір з контрагентом або на основі замовлення</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Крок 1: Пошук контрагента */}
                <div className="space-y-4">
                  <div>
                    <Label>Крок 1: Пошук контрагента за ЄДРПОУ</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="Введіть код ЄДРПОУ"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={searchCounterparty}
                        className="btn-primary"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Пошук
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className="p-4 mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{foundCounterparty.representative_name || foundCounterparty.name}</p>
                            <p className="text-sm text-gray-600">ЄДРПОУ: {foundCounterparty.edrpou}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {foundCounterparty && (
                    <>
                      {/* Крок 2: Вибір типу договору */}
                      <div className="space-y-3">
                        <Label>Крок 2: Оберіть тип договору</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              !contractBasedOnOrder 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setContractBasedOnOrder(false)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                checked={!contractBasedOnOrder}
                                onChange={() => setContractBasedOnOrder(false)}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-semibold">Договір без замовлення</p>
                                <p className="text-sm text-gray-600">Створити договір з вільним предметом</p>
                              </div>
                            </div>
                          </div>
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              contractBasedOnOrder 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setContractBasedOnOrder(true)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                checked={contractBasedOnOrder}
                                onChange={() => setContractBasedOnOrder(true)}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-semibold">Договір на основі замовлення</p>
                                <p className="text-sm text-gray-600">Автоматично заповнити з замовлення</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Форма без замовлення */}
                      {!contractBasedOnOrder && (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          setLoading(true);
                          
                          try {
                            const pdfResponse = await axios.post(`${API}/contracts/generate-pdf`, {
                              counterparty_edrpou: searchEdrpou,
                              subject: contractForm.subject,
                              items: [],
                              total_amount: contractForm.amount,
                              custom_template: contractTemplate || null,
                              template_settings: templateSettings
                            });
                            
                            if (pdfResponse.data.success) {
                              // If no drive_file_id, fetch PDF as blob from local storage
                              if (!pdfResponse.data.drive_file_id || pdfResponse.data.drive_file_id === '') {
                                try {
                                  const contractNumber = pdfResponse.data.contract_number;
                                  const localPdfUrl = `${API}/contracts/pdf/${contractNumber}`;
                                  
                                  const pdfBlob = await axios.get(localPdfUrl, { responseType: 'blob' });
                                  const blobUrl = URL.createObjectURL(pdfBlob.data);
                                  
                                  setContractPdfData({
                                    drive_view_link: blobUrl,
                                    drive_download_link: localPdfUrl,
                                    drive_file_id: '',
                                    contract_number: contractNumber,
                                    is_blob: true,
                                    counterpartyEmail: foundCounterparty?.email || ''
                                  });
                                } catch (blobError) {
                                  console.error('Error loading contract PDF blob:', blobError);
                                  setContractPdfData({
                                    ...pdfResponse.data,
                                    counterpartyEmail: foundCounterparty?.email || ''
                                  });
                                }
                              } else {
                                setContractPdfData({
                                  ...pdfResponse.data,
                                  counterpartyEmail: foundCounterparty?.email || ''
                                });
                              }
                              
                              setContractEmailForm({
                                recipient: 'counterparty',
                                customEmail: '',
                                counterpartyEmail: foundCounterparty?.email || ''
                              });
                              
                              setTimeout(() => {
                                setShowContractPreview(true);
                                toast.success('Договір успішно згенеровано!');
                                fetchAllDocuments();
                                
                                // Reset
                                setContractForm({
                                  subject: '',
                                  amount: 0,
                                  items: []
                                });
                                setSearchEdrpou('');
                                setFoundCounterparty(null);
                                setContractBasedOnOrder(false);
                              }, 100);
                            }
                          } catch (error) {
                            console.error('Contract generation error:', error);
                            toast.error(error.response?.data?.detail || 'Помилка при створенні договору');
                          } finally {
                            setLoading(false);
                          }
                        }} className="space-y-4">
                          <div>
                            <Label>Предмет договору</Label>
                            <Input
                              value={contractForm.subject}
                              onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                              placeholder="Наприклад: Постачання товарів/послуг"
                              required
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Сума договору (грн)</Label>
                            <Input
                              type="number"
                              value={contractForm.amount}
                              onChange={(e) => setContractForm({...contractForm, amount: parseFloat(e.target.value) || 0})}
                              placeholder="0.00"
                              required
                              className="mt-2"
                            />
                          </div>
                          <Button type="submit" className="w-full btn-primary" disabled={loading}>
                            {loading ? 'Створення...' : 'Створити договір'}
                          </Button>
                        </form>
                      )}

                      {/* Форма на основі замовлення */}
                      {contractBasedOnOrder && (
                        <div className="space-y-4">
                          {/* Select Order Dropdown */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Оберіть замовлення</Label>
                            {contractAvailableOrders.length > 0 ? (
                              <select
                                value={contractSelectedOrder}
                                onChange={(e) => {
                                  const selectedOrderNum = e.target.value;
                                  setContractSelectedOrder(selectedOrderNum);
                                  
                                  // Auto-fill contract data from selected order
                                  const order = contractAvailableOrders.find(o => o.number === selectedOrderNum);
                                  if (order) {
                                    setContractForm({
                                      subject: `Договір на основі замовлення №${order.number}`,
                                      amount: order.total_amount || 0,
                                      items: order.items || []
                                    });
                                  }
                                }}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                              >
                                <option value="">-- Оберіть замовлення --</option>
                                {contractAvailableOrders.map(order => (
                                  <option key={order.number} value={order.number}>
                                    Замовлення № {order.number} від {order.date} - {order.total_amount} грн
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                                Немає доступних замовлень для цього контрагента
                              </p>
                            )}
                          </div>

                          {/* Contract Subject */}
                          {contractSelectedOrder && (
                            <>
                              <div className="space-y-2">
                                <Label>Предмет договору</Label>
                                <Input
                                  value={contractForm.subject}
                                  onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                                  placeholder="Наприклад: Постачання товарів/послуг"
                                  required
                                  className="mt-2"
                                />
                              </div>

                              {/* Contract Amount */}
                              <div className="space-y-2">
                                <Label>Сума договору (грн)</Label>
                                <Input
                                  type="number"
                                  value={contractForm.amount}
                                  onChange={(e) => setContractForm({...contractForm, amount: parseFloat(e.target.value) || 0})}
                                  placeholder="0.00"
                                  required
                                  className="mt-2"
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              {/* Submit Button */}
                              <Button 
                                onClick={handleContractFromOrderSubmit}
                                className="w-full btn-primary" 
                                disabled={loading}
                              >
                                {loading ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                                ) : (
                                  'Створити договір на основі замовлення'
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* List of all contracts */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Всі договори ({allContracts.length})</CardTitle>
                    <CardDescription>Останні створені договори</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      fetchAllDocuments();
                      toast.success('Список оновлено');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Оновити
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allContracts.length > 0 ? (
                  <div className="space-y-3">
                    {allContracts.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-teal-50 rounded-lg border border-teal-200 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-gray-900">Договір №{doc.number}</p>
                          <p className="text-sm text-gray-600">від {doc.date}</p>
                          <p className="text-sm text-gray-700 mt-1">{doc.counterparty_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{doc.subject}</p>
                          <p className="text-sm font-medium text-teal-700 mt-1">Сума: {doc.amount} грн</p>
                        </div>
                        {doc.drive_file_id && doc.drive_file_id !== '' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setContractPdfData({
                                drive_file_id: doc.drive_file_id,
                                drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                drive_download_link: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`,
                                contract_number: doc.number
                              });
                              setContractEmailForm({
                                recipient: 'counterparty',
                                customEmail: '',
                                counterpartyEmail: ''
                              });
                              setShowContractPreview(true);
                            }}
                            className="btn-secondary"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Переглянути
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Договорів поки немає</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Creation Dialog */}
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="sm:max-w-[600px] bg-white" data-testid="order-dialog">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">Створення документів на основі замовлення</DialogTitle>
              <DialogDescription className="text-gray-600">
                Виберіть документи, які потрібно створити на основі цього замовлення
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Checkbox
                  id="create-order"
                  checked={selectedDocs.order}
                  onCheckedChange={(checked) => setSelectedDocs({...selectedDocs, order: checked})}
                />
                <Label htmlFor="create-order" className="cursor-pointer text-blue-900 font-semibold">
                  ✓ Створити замовлення (вже створено)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="create-invoice"
                  checked={selectedDocs.invoice}
                  onCheckedChange={(checked) => setSelectedDocs({...selectedDocs, invoice: checked})}
                />
                <Label htmlFor="create-invoice" className="cursor-pointer text-gray-800 font-medium">Створити Рахунок</Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="create-act"
                  checked={selectedDocs.act}
                  onCheckedChange={(checked) => setSelectedDocs({...selectedDocs, act: checked})}
                />
                <Label htmlFor="create-act" className="cursor-pointer text-gray-800 font-medium">Створити Акт виконаних робіт</Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="create-waybill"
                  checked={selectedDocs.waybill}
                  onCheckedChange={(checked) => setSelectedDocs({...selectedDocs, waybill: checked})}
                />
                <Label htmlFor="create-waybill" className="cursor-pointer text-gray-800 font-medium">Створити Видаткову накладну</Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="create-contract"
                  checked={selectedDocs.contract}
                  onCheckedChange={(checked) => setSelectedDocs({...selectedDocs, contract: checked})}
                />
                <Label htmlFor="create-contract" className="cursor-pointer text-gray-800 font-medium">Створити Договір</Label>
              </div>
              
              {selectedDocs.contract && (
                <div className="ml-6 space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-contract-subject" className="text-gray-800 font-medium">Предмет договору *</Label>
                    <Input
                      id="dialog-contract-subject"
                      value={contractForm.subject}
                      onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                      placeholder="Наприклад: Постачання товарів..."
                      className="bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dialog-contract-amount" className="text-gray-800 font-medium">Сума договору (грн)</Label>
                    <Input
                      id="dialog-contract-amount"
                      type="number"
                      step="0.01"
                      value={contractForm.amount || (orderData?.total_amount || 0)}
                      onChange={(e) => setContractForm({...contractForm, amount: parseFloat(e.target.value)})}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline" 
                onClick={() => setShowOrderDialog(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Скасувати
              </Button>
              <Button 
                onClick={handleCreateDocumentsFromOrder}
                disabled={loading || (!selectedDocs.order && !selectedDocs.invoice && !selectedDocs.act && !selectedDocs.waybill && !selectedDocs.contract)}
                className="btn-primary"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                ) : (
                  'Створити документи'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Contract PDF Preview Dialog */}
        <Dialog open={showContractPreview} onOpenChange={setShowContractPreview}>
          <DialogContent className="sm:max-w-[1000px] max-h-[95vh] bg-white z-[100]" style={{zIndex: 9999}}>
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Попередній перегляд договору {contractPdfData?.contract_number}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Перегляньте договір та надішліть його на email
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(95vh - 200px)'}}>
              {/* PDF Preview */}
              {contractPdfData && (
                <div className="space-y-2">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100" style={{height: '500px'}}>
                    {contractPdfData.drive_view_link ? (
                      contractPdfData.is_blob ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4 p-6">
                          <CheckCircle className="w-16 h-16 text-green-500" />
                          <h3 className="text-xl font-semibold">Договір успішно створено!</h3>
                          <p className="text-center text-gray-600">
                            PDF документ було згенеровано та збережено локально.<br/>
                            Номер договору: <span className="font-semibold">{contractPdfData.contract_number}</span>
                          </p>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = contractPdfData.drive_download_link || contractPdfData.drive_view_link;
                              link.download = `Договір_${contractPdfData.contract_number}.pdf`;
                              link.target = '_blank';
                              link.click();
                              toast.success('PDF завантажується...');
                            }}
                            className="btn-primary"
                            size="lg"
                          >
                            <FileText className="w-5 h-5 mr-2" />
                            Завантажити PDF
                          </Button>
                          <p className="text-sm text-gray-500">
                            Натисніть кнопку для завантаження або відкриття PDF документу
                          </p>
                        </div>
                      ) : (
                        <iframe
                          src={`https://drive.google.com/viewerng/viewer?embedded=true&url=https://drive.google.com/uc?id=${contractPdfData.drive_file_id}&export=download`}
                          style={{width: '100%', height: '100%', border: 'none'}}
                          title="Попередній перегляд договору"
                          allow="autoplay"
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                        <p className="text-lg">PDF генерується...</p>
                        <p className="text-sm text-gray-500">Зачекайте кілька секунд, або оновіть перегляд</p>
                        <Button
                          onClick={() => {
                            setShowContractPreview(false);
                            fetchAllDocuments();
                            toast.info('Оновлюємо список документів...');
                            setTimeout(() => {
                              setShowContractPreview(true);
                            }, 500);
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-4"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Оновити перегляд
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Email options */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-gray-800 font-semibold">Надіслати договір на email:</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email-counterparty"
                      checked={contractEmailForm.recipient === 'counterparty'}
                      onChange={() => setContractEmailForm({...contractEmailForm, recipient: 'counterparty'})}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="email-counterparty" className="cursor-pointer text-gray-700">
                      Email контрагента ({contractEmailForm.counterpartyEmail || 'не вказано'})
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email-custom"
                      checked={contractEmailForm.recipient === 'custom'}
                      onChange={() => setContractEmailForm({...contractEmailForm, recipient: 'custom'})}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="email-custom" className="cursor-pointer text-gray-700">
                      Інший email
                    </Label>
                  </div>
                  
                  {contractEmailForm.recipient === 'custom' && (
                    <Input
                      type="email"
                      placeholder="Введіть email"
                      value={contractEmailForm.customEmail}
                      onChange={(e) => setContractEmailForm({...contractEmailForm, customEmail: e.target.value})}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                onClick={async () => {
                  if (!contractPdfData) return;
                  
                  let recipientEmail = '';
                  if (contractEmailForm.recipient === 'counterparty') {
                    recipientEmail = contractEmailForm.counterpartyEmail;
                  } else if (contractEmailForm.recipient === 'custom') {
                    recipientEmail = contractEmailForm.customEmail;
                  }
                  
                  if (!recipientEmail) {
                    toast.error('Вкажіть email отримувача');
                    return;
                  }
                  
                  setLoading(true);
                  try {
                    await axios.post(`${API}/contracts/send-email`, {
                      contract_pdf_path: contractPdfData.pdf_path,
                      recipient_email: recipientEmail,
                      contract_number: contractPdfData.contract_number,
                      drive_link: contractPdfData.drive_view_link
                    });
                    
                    toast.success(`Договір відправлено на ${recipientEmail}`);
                    setShowContractPreview(false);
                    setContractPdfData(null);
                    setContractForm({ subject: '', amount: 0 });
                    setSearchEdrpou('');
                    setFoundCounterparty(null);
                  } catch (error) {
                    toast.error('Помилка при відправці email');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Відправка...</>
                ) : (
                  'Надіслати на email'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document PDF Preview Dialog (for invoices, acts, waybills) */}
        <Dialog open={showDocumentPreview} onOpenChange={setShowDocumentPreview}>
          <DialogContent className="sm:max-w-[1000px] max-h-[95vh] bg-white z-[100]" style={{zIndex: 9999}}>
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Попередній перегляд {
                  currentDocType === 'invoice' ? 'рахунку' : 
                  currentDocType === 'act' ? 'акту' : 
                  currentDocType === 'waybill' ? 'накладної' :
                  currentDocType === 'order' ? 'замовлення' : 'документу'
                } {documentPdfData?.[`${currentDocType}_number`]}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Перегляньте документ та надішліть його на email
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(95vh - 200px)'}}>
              {/* PDF Preview */}
              {documentPdfData && (
                <div className="space-y-2">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100" style={{height: '500px'}}>
                    {documentPdfData.drive_file_id ? (
                      // Google Drive PDF - show iframe
                      <iframe
                        src={`https://drive.google.com/viewerng/viewer?embedded=true&url=https://drive.google.com/uc?id=${documentPdfData.drive_file_id}&export=download`}
                        style={{width: '100%', height: '100%', border: 'none'}}
                        title="Попередній перегляд документу"
                        allow="autoplay"
                      />
                    ) : documentPdfData.is_blob && documentPdfData.drive_view_link ? (
                      // Blob URL - show directly in iframe
                      <iframe
                        src={documentPdfData.drive_view_link}
                        style={{width: '100%', height: '100%', border: 'none'}}
                        title="Попередній перегляд документу"
                      />
                    ) : documentPdfData.drive_view_link ? (
                      // Local PDF - show message with open button (fallback)
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 p-6">
                        <FileText className="w-20 h-20 text-blue-500" />
                        <p className="text-xl font-semibold text-gray-800">PDF згенеровано успішно!</p>
                        <p className="text-sm text-gray-600 text-center">
                          Натисніть кнопку нижче щоб відкрити PDF
                        </p>
                        <Button
                          onClick={() => window.open(documentPdfData.drive_view_link, '_blank')}
                          className="bg-blue-500 text-white hover:bg-blue-600 px-6 py-3"
                          size="lg"
                        >
                          <FileText className="w-5 h-5 mr-2" />
                          Відкрити PDF
                        </Button>
                        <p className="text-xs text-gray-500 mt-4">
                          Ви все ще можете надіслати PDF на email нижче
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 p-6">
                        <FileText className="w-20 h-20 text-blue-500" />
                        <p className="text-xl font-semibold text-gray-800">PDF згенеровано успішно!</p>
                        <p className="text-sm text-gray-600 text-center">
                          PDF було відкрито в новій вкладці.<br/>
                          Якщо вікно не відкрилось, натисніть кнопку нижче.
                        </p>
                        <Button
                          onClick={() => window.open(documentPdfData.drive_view_link, '_blank')}
                          className="bg-blue-500 text-white hover:bg-blue-600 px-6 py-3"
                          size="lg"
                        >
                          <FileText className="w-5 h-5 mr-2" />
                          Відкрити PDF
                        </Button>
                        <p className="text-xs text-gray-500 mt-4">
                          Ви все ще можете надіслати PDF на email нижче
                        </p>
                      </div>
                  )}
                </div>
                {documentPdfData.drive_view_link && (
                  <div className="text-center">
                    <Button
                      onClick={() => window.open(
                        documentPdfData.drive_file_id 
                          ? `https://drive.google.com/file/d/${documentPdfData.drive_file_id}/view` 
                          : documentPdfData.drive_view_link, 
                        '_blank'
                      )}
                      variant="outline"
                      size="sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Відкрити у новій вкладці
                    </Button>
                  </div>
                )}
              </div>
              )}
              
              {/* Email options */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-gray-800 font-semibold">Надіслати документ на email:</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="doc-email-counterparty"
                      checked={documentEmailForm.recipient === 'counterparty'}
                      onChange={() => setDocumentEmailForm({...documentEmailForm, recipient: 'counterparty'})}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="doc-email-counterparty" className="cursor-pointer text-gray-700">
                      Email контрагента ({documentEmailForm.counterpartyEmail || 'не вказано'})
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="doc-email-custom"
                      checked={documentEmailForm.recipient === 'custom'}
                      onChange={() => setDocumentEmailForm({...documentEmailForm, recipient: 'custom'})}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="doc-email-custom" className="cursor-pointer text-gray-700">
                      Інший email
                    </Label>
                  </div>
                  
                  {documentEmailForm.recipient === 'custom' && (
                    <Input
                      type="email"
                      placeholder="Введіть email"
                      value={documentEmailForm.customEmail}
                      onChange={(e) => setDocumentEmailForm({...documentEmailForm, customEmail: e.target.value})}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              {/* Button to create documents from order */}
              {currentDocType === 'order' && (
                <Button 
                  onClick={() => {
                    // Save current order data for creating other documents
                    console.log('documentPdfData:', documentPdfData);
                    const formData = documentPdfData?.order_form_data;
                    console.log('formData:', formData);
                    console.log('order_number:', documentPdfData?.order_number);
                    
                    if (formData && documentPdfData?.order_number) {
                      setSelectedOrderData({
                        counterparty_edrpou: formData.counterparty_edrpou,
                        items: formData.items,
                        total_amount: formData.total_amount,
                        order_number: documentPdfData.order_number
                      });
                      console.log('Opening create from order dialog');
                      setShowCreateFromOrder(true);
                    } else {
                      console.error('No form data or order_number available');
                      toast.error('Немає даних замовлення. Закрийте та відкрийте замовлення знову.');
                    }
                  }}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Створити документи на основі замовлення
                </Button>
              )}
              
              <Button 
                onClick={async () => {
                  if (!documentPdfData) return;
                  
                  let recipientEmail = '';
                  if (documentEmailForm.recipient === 'counterparty') {
                    recipientEmail = documentEmailForm.counterpartyEmail;
                  } else if (documentEmailForm.recipient === 'custom') {
                    recipientEmail = documentEmailForm.customEmail;
                  }
                  
                  if (!recipientEmail) {
                    toast.error('Вкажіть email отримувача');
                    return;
                  }
                  
                  setLoading(true);
                  try {
                    // Determine the endpoint and payload based on document type
                    if (currentDocType === 'order') {
                      await axios.post(`${API}/orders/send-email`, {
                        order_pdf_path: documentPdfData.pdf_path,
                        recipient_email: recipientEmail,
                        order_number: documentPdfData.order_number,
                        drive_link: documentPdfData.drive_view_link
                      });
                      toast.success(`Замовлення відправлено на ${recipientEmail}`);
                    } else {
                      // For other document types (invoices, acts, waybills)
                      toast.info('Функція відправки email для цього типу документів буде додана незабаром');
                    }
                    
                    setShowDocumentPreview(false);
                    setDocumentPdfData(null);
                    setDocumentForm({
                      counterparty_edrpou: '',
                      items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
                      total_amount: 0
                    });
                    setSearchEdrpou('');
                    setFoundCounterparty(null);
                    setShowDocCreateDialog(false);
                  } catch (error) {
                    toast.error('Помилка при відправці email: ' + (error.response?.data?.detail || error.message));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Відправка...</>
                ) : (
                  'Надіслати на email'
                )}
              </Button>
              
              <Button 
                onClick={() => {
                  setShowDocumentPreview(false);
                  setDocumentPdfData(null);
                }}
                variant="outline"
              >
                Закрити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog for creating documents from order */}
        <Dialog open={showCreateFromOrder} onOpenChange={setShowCreateFromOrder}>
          <DialogContent className="sm:max-w-[600px] bg-white" style={{zIndex: 10000}}>
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Створити документ на основі замовлення
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Оберіть тип документа для автоматичного створення з даними замовлення
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-6">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={async () => {
                    try {
                      if (!selectedOrderData) return;
                      
                      setLoading(true);
                      const payload = {
                        counterparty_edrpou: selectedOrderData.counterparty_edrpou,
                        items: selectedOrderData.items,
                        total_amount: selectedOrderData.total_amount,
                        based_on_order: selectedOrderData.order_number
                      };
                      
                      const response = await axios.post(`${API}/invoices/generate-pdf`, payload);
                      
                      if (response.data.success) {
                        console.log('Invoice created successfully:', response.data);
                        
                        setShowCreateFromOrder(false);
                        toast.success(`Рахунок №${response.data.invoice_number} успішно створено на основі замовлення!`);
                        fetchAllDocuments();
                      }
                    } catch (error) {
                      toast.error('Помилка створення рахунку: ' + (error.response?.data?.detail || error.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-green-50 border-2 border-green-300 hover:bg-green-100 text-green-700"
                >
                  <FileText className="w-8 h-8" />
                  <span className="font-semibold">Рахунок</span>
                </Button>
                
                <Button
                  onClick={async () => {
                    try {
                      if (!selectedOrderData) return;
                      
                      setLoading(true);
                      const payload = {
                        counterparty_edrpou: selectedOrderData.counterparty_edrpou,
                        items: selectedOrderData.items,
                        total_amount: selectedOrderData.total_amount,
                        based_on_order: selectedOrderData.order_number
                      };
                      
                      const response = await axios.post(`${API}/acts/generate-pdf`, payload);
                      
                      if (response.data.success) {
                        console.log('Act created successfully:', response.data);
                        
                        setShowCreateFromOrder(false);
                        toast.success(`Акт №${response.data.act_number} успішно створено на основі замовлення!`);
                        fetchAllDocuments();
                      }
                    } catch (error) {
                      toast.error('Помилка створення акту: ' + (error.response?.data?.detail || error.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-purple-50 border-2 border-purple-300 hover:bg-purple-100 text-purple-700"
                >
                  <FileCheck className="w-8 h-8" />
                  <span className="font-semibold">Акт</span>
                </Button>
                
                <Button
                  onClick={async () => {
                    try {
                      if (!selectedOrderData) return;
                      
                      setLoading(true);
                      const payload = {
                        counterparty_edrpou: selectedOrderData.counterparty_edrpou,
                        items: selectedOrderData.items,
                        total_amount: selectedOrderData.total_amount,
                        based_on_order: selectedOrderData.order_number
                      };
                      
                      const response = await axios.post(`${API}/waybills/generate-pdf`, payload);
                      
                      if (response.data.success) {
                        setCurrentDocType('waybill');
                        setDocumentPdfData(response.data);
                        setShowCreateFromOrder(false);
                        setShowDocumentPreview(false);
                        setTimeout(() => setShowDocumentPreview(true), 100);
                        toast.success('Накладну успішно створено на основі замовлення!');
                        fetchAllDocuments();
                      }
                    } catch (error) {
                      toast.error('Помилка створення накладної: ' + (error.response?.data?.detail || error.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-orange-50 border-2 border-orange-300 hover:bg-orange-100 text-orange-700"
                >
                  <Truck className="w-8 h-8" />
                  <span className="font-semibold">Накладна</span>
                </Button>
                
                <Button
                  onClick={async () => {
                    try {
                      if (!selectedOrderData) return;
                      
                      setLoading(true);
                      
                      console.log('selectedOrderData:', selectedOrderData);
                      
                      // Validate order_number exists
                      if (!selectedOrderData.order_number) {
                        toast.error('Некоректний номер замовлення. Спробуйте ще раз.');
                        setLoading(false);
                        return;
                      }
                      
                      // Validate and convert amount to number
                      const totalAmount = parseFloat(selectedOrderData.total_amount) || 0;
                      
                      // Convert amount to text (only if valid)
                      let amountText = '';
                      if (totalAmount > 0) {
                        try {
                          amountText = numberToUkrainianText(totalAmount);
                        } catch (error) {
                          console.error('Error converting amount to text:', error);
                          amountText = `${totalAmount} грн`;
                        }
                      }
                      
                      console.log('amountText:', amountText);
                      
                      const payload = {
                        counterparty_edrpou: selectedOrderData.counterparty_edrpou,
                        subject: `Постачання товарів згідно замовлення №${selectedOrderData.order_number || 'НОВИЙ'}`,
                        items: [],
                        total_amount: totalAmount,
                        total_amount_text: amountText,
                        vat_note: 'без ПДВ',
                        based_on_order: selectedOrderData.order_number || null
                      };
                      
                      console.log('Contract payload:', payload);
                      
                      // Add custom template if exists
                      if (contractTemplate && contractTemplate.trim() !== '') {
                        payload.custom_template = contractTemplate;
                      }
                      
                      const response = await axios.post(`${API}/contracts/generate-pdf`, payload);
                      
                      if (response.data.success) {
                        console.log('Contract created successfully:', response.data);
                        
                        // Close dialog and show success
                        setShowCreateFromOrder(false);
                        toast.success(`Договір №${response.data.contract_number} успішно створено на основі замовлення!`);
                        
                        // Refresh documents
                        fetchAllDocuments();
                      }
                    } catch (error) {
                      toast.error('Помилка створення договору: ' + (error.response?.data?.detail || error.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-blue-50 border-2 border-blue-300 hover:bg-blue-100 text-blue-700"
                >
                  <FileSignature className="w-8 h-8" />
                  <span className="font-semibold">Договір</span>
                </Button>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowCreateFromOrder(false);
                  setSelectedOrderData(null);
                }}
              >
                Скасувати
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Order Details Dialog */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Деталі замовлення №{currentOrderDetails?.number}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Інформація про замовлення від {currentOrderDetails?.date}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Order Info */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold text-blue-900">Основна інформація</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Номер:</p>
                      <p className="font-semibold">{currentOrderDetails?.number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Дата:</p>
                      <p className="font-semibold">{currentOrderDetails?.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Контрагент:</p>
                      <p className="font-semibold">{currentOrderDetails?.counterparty_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">ЄДРПОУ:</p>
                      <p className="font-semibold">{currentOrderDetails?.counterparty_edrpou}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600">Загальна сума:</p>
                      <p className="font-semibold text-lg text-blue-700">{currentOrderDetails?.total_amount} грн</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Items List */}
              {currentOrderDetails?.items && currentOrderDetails.items.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Позиції ({currentOrderDetails.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      {currentOrderDetails.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} {item.unit} × {item.price} грн
                              </p>
                            </div>
                            <p className="font-semibold text-blue-700">{item.amount} грн</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Related Documents */}
              {(relatedDocuments.invoices.length > 0 || relatedDocuments.acts.length > 0 || 
                relatedDocuments.waybills.length > 0 || relatedDocuments.contracts.length > 0) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">
                      Документи на основі замовлення ({
                        relatedDocuments.invoices.length + relatedDocuments.acts.length + 
                        relatedDocuments.waybills.length + relatedDocuments.contracts.length
                      })
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-3">
                      {/* Invoices */}
                      {relatedDocuments.invoices.map((doc, idx) => (
                        <div key={`inv-${idx}`} className="p-3 bg-green-50 rounded border border-green-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-green-800">📄 Рахунок №{doc.number}</p>
                            <p className="text-sm text-gray-600">від {doc.date} | {doc.total_amount} грн</p>
                          </div>
                          <div className="flex gap-2">
                            {doc.drive_file_id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDocumentPdfData({
                                      drive_file_id: doc.drive_file_id,
                                      drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                      invoice_number: doc.number
                                    });
                                    setCurrentDocType('invoice');
                                    setShowOrderDetails(false);
                                    setShowDocumentPreview(true);
                                  }}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast.info('Функція відправки email буде додана незабаром');
                                  }}
                                  className="text-xs"
                                >
                                  📧 Email
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Acts */}
                      {relatedDocuments.acts.map((doc, idx) => (
                        <div key={`act-${idx}`} className="p-3 bg-purple-50 rounded border border-purple-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-purple-800">✅ Акт №{doc.number}</p>
                            <p className="text-sm text-gray-600">від {doc.date} | {doc.total_amount} грн</p>
                          </div>
                          <div className="flex gap-2">
                            {doc.drive_file_id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDocumentPdfData({
                                      drive_file_id: doc.drive_file_id,
                                      drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                      act_number: doc.number
                                    });
                                    setCurrentDocType('act');
                                    setShowOrderDetails(false);
                                    setShowDocumentPreview(true);
                                  }}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast.info('Функція відправки email буде додана незабаром');
                                  }}
                                  className="text-xs"
                                >
                                  📧 Email
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Waybills */}
                      {relatedDocuments.waybills.map((doc, idx) => (
                        <div key={`wb-${idx}`} className="p-3 bg-orange-50 rounded border border-orange-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-orange-800">🚚 Накладна №{doc.number}</p>
                            <p className="text-sm text-gray-600">від {doc.date} | {doc.total_amount} грн</p>
                          </div>
                          <div className="flex gap-2">
                            {doc.drive_file_id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDocumentPdfData({
                                      drive_file_id: doc.drive_file_id,
                                      drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                      waybill_number: doc.number
                                    });
                                    setCurrentDocType('waybill');
                                    setShowOrderDetails(false);
                                    setShowDocumentPreview(true);
                                  }}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast.info('Функція відправки email буде додана незабаром');
                                  }}
                                  className="text-xs"
                                >
                                  📧 Email
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Contracts */}
                      {relatedDocuments.contracts.map((doc, idx) => (
                        <div key={`con-${idx}`} className="p-3 bg-blue-50 rounded border border-blue-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-blue-800">📋 Договір №{doc.number}</p>
                            <p className="text-sm text-gray-600">від {doc.date}</p>
                          </div>
                          <div className="flex gap-2">
                            {doc.drive_file_id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setContractPdfData({
                                      drive_file_id: doc.drive_file_id,
                                      drive_view_link: `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
                                      contract_number: doc.number
                                    });
                                    setShowOrderDetails(false);
                                    setShowContractPreview(true);
                                  }}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast.info('Функція відправки email буде додана незабаром');
                                  }}
                                  className="text-xs"
                                >
                                  📧 Email
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                {currentOrderDetails?.drive_file_id ? (
                  <Button
                    onClick={() => {
                      setDocumentPdfData({
                        drive_file_id: currentOrderDetails.drive_file_id,
                        drive_view_link: `https://drive.google.com/file/d/${currentOrderDetails.drive_file_id}/view`,
                        drive_download_link: `https://drive.google.com/uc?export=download&id=${currentOrderDetails.drive_file_id}`,
                        order_number: currentOrderDetails.number,
                        order_form_data: {
                          counterparty_edrpou: currentOrderDetails.counterparty_edrpou || '',
                          items: currentOrderDetails.items || [],
                          total_amount: parseFloat(currentOrderDetails.total_amount) || 0
                        }
                      });
                      setCurrentDocType('order');
                      setShowOrderDetails(false);
                      setShowDocumentPreview(true);
                    }}
                    className="btn-primary flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Переглянути PDF
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const payload = {
                          counterparty_edrpou: currentOrderDetails.counterparty_edrpou,
                          items: currentOrderDetails.items || [],
                          total_amount: parseFloat(currentOrderDetails.total_amount) || 0,
                          order_number: currentOrderDetails.number  // Use existing order number
                        };
                        
                        const response = await axios.post(`${API}/orders/generate-pdf`, payload);
                        
                        if (response.data.success) {
                          toast.success('PDF успішно згенеровано!');
                          fetchAllDocuments();
                          
                          // If no drive_file_id (Drive not working), fetch PDF as blob for preview
                          if (!response.data.drive_file_id) {
                            const localPdfUrl = `${API}/orders/pdf/${response.data.order_number}`;
                            
                            try {
                              // Fetch PDF as blob
                              const pdfResponse = await axios.get(localPdfUrl, {
                                responseType: 'blob'
                              });
                              
                              // Create blob URL for iframe
                              const blobUrl = URL.createObjectURL(pdfResponse.data);
                              
                              // Set data with blob URL for iframe preview
                              setDocumentPdfData({
                                drive_view_link: blobUrl,
                                drive_download_link: localPdfUrl,
                                drive_file_id: '',
                                order_number: response.data.order_number,
                                pdf_path: response.data.pdf_path,
                                is_blob: true, // Flag to indicate this is a blob URL
                                order_form_data: {
                                  counterparty_edrpou: currentOrderDetails.counterparty_edrpou || '',
                                  items: currentOrderDetails.items || [],
                                  total_amount: parseFloat(currentOrderDetails.total_amount) || 0
                                }
                              });
                              setCurrentDocType('order');
                              setShowOrderDetails(false);
                              setShowDocumentPreview(true);
                            } catch (blobError) {
                              console.error('Error loading PDF blob:', blobError);
                              // Fallback: just open in new tab
                              window.open(localPdfUrl, '_blank');
                              toast.info('PDF відкрито в новій вкладці');
                            }
                          } else {
                            // With Drive, show preview dialog as usual
                            setDocumentPdfData({
                              drive_view_link: response.data.drive_view_link,
                              drive_download_link: response.data.drive_download_link,
                              drive_file_id: response.data.drive_file_id,
                              order_number: response.data.order_number,
                              pdf_path: response.data.pdf_path,
                              order_form_data: {
                                counterparty_edrpou: currentOrderDetails.counterparty_edrpou || '',
                                items: currentOrderDetails.items || [],
                                total_amount: parseFloat(currentOrderDetails.total_amount) || 0
                              }
                            });
                            setCurrentDocType('order');
                            setShowOrderDetails(false);
                            setShowDocumentPreview(true);
                          }
                        }
                      } catch (error) {
                        toast.error('Помилка генерації PDF: ' + (error.response?.data?.detail || error.message));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-orange-500 text-white hover:bg-orange-600 flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Згенерувати PDF
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    setShowOrderDetails(false);
                    setShowCreateFromOrder(true);
                  }}
                  className="btn-primary bg-green-600 hover:bg-green-700 flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Створити документи
                </Button>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowOrderDetails(false);
                  setCurrentOrderDetails(null);
                }}
              >
                Закрити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Document Creation Dialog from Counterparty View */}
        <Dialog open={showDocCreateDialog} onOpenChange={setShowDocCreateDialog}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">Створення {docTypeToCreate === 'contracts' ? 'договору' : 'документа'}</DialogTitle>
            </DialogHeader>
            
            {docTypeToCreate === 'contracts' ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium">Предмет договору *</Label>
                  <Input
                    value={contractForm.subject}
                    onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                    placeholder="Наприклад: Постачання товарів..."
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium">Сума договору (грн) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={contractForm.amount}
                    onChange={(e) => setContractForm({...contractForm, amount: parseFloat(e.target.value)})}
                    className="bg-white"
                  />
                </div>
                <Button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await axios.post(`${API}/contracts`, {
                        counterparty_edrpou: selectedCounterparty.edrpou,
                        subject: contractForm.subject,
                        amount: contractForm.amount
                      });
                      toast.success('Договір успішно створено!');
                      setShowDocCreateDialog(false);
                      setContractForm({ subject: '', amount: 0 });
                      
                      const docsResponse = await axios.get(`${API}/counterparties/${selectedCounterparty.edrpou}/documents`);
                      setCounterpartyDocuments(docsResponse.data);
                    } catch (error) {
                      toast.error('Помилка при створенні договору');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</> : 'Створити договір'}
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => handleDocumentSubmit(e, docTypeToCreate, docTypeToCreate)} className="space-y-4 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-800 font-medium">Товари/Роботи</Label>
                    <Button 
                      type="button" 
                      onClick={addItem} 
                      size="sm"
                      className="btn-secondary"
                    >
                      <Plus className="w-4 h-4 mr-1" />Додати
                    </Button>
                  </div>

                  {documentForm.items.map((item, index) => (
                    <div key={index} className="item-card p-4 space-y-3 bg-white border border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-700 font-medium">Назва</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            placeholder="Назва товару"
                            required
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-700 font-medium">Одиниця виміру</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            placeholder="шт, кг, л"
                            required
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-700 font-medium">Кількість</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            required
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-700 font-medium">Ціна</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            required
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-700 font-medium">Сума</Label>
                          <Input
                            type="number"
                            value={item.amount.toFixed(2)}
                            readOnly
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                      {documentForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />Видалити
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Загальна сума:</Label>
                    <span className="text-2xl font-bold text-teal-700">
                      {documentForm.total_amount.toFixed(2)} грн
                    </span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-primary py-6 text-lg"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Збереження...</> : 'Створити документ'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Contract Template Editor Dialog */}
        <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Редактор шаблону договору
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Редагуйте текст договору та налаштування форматування. Використовуйте змінні у форматі {`{{Назва_змінної}}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(90vh - 200px)'}}>
              
              {/* Available variables */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold text-blue-900">Доступні змінні (клікніть для вставки):</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-blue-800 mb-2">Постачальник (Мої дані):</p>
                      <button onClick={() => insertVariable('supplier_name')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('supplier_edrpou')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('supplier_address')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('supplier_iban')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('supplier_bank')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('supplier_mfo')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('supplier_email')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_email}}`} - Email</button>
                      <button onClick={() => insertVariable('supplier_phone')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_phone}}`} - Телефон</button>
                      <button onClick={() => insertVariable('supplier_representative')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_representative}}`} - В особі</button>
                      <button onClick={() => insertVariable('supplier_signature')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700 font-semibold">{`{{supplier_signature}}`} - Підпис ⭐</button>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-2">Покупець (Основні дані):</p>
                      <button onClick={() => insertVariable('buyer_name')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('buyer_edrpou')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('buyer_address')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('buyer_iban')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('buyer_bank')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('buyer_mfo')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('buyer_email')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_email}}`} - Email</button>
                      <button onClick={() => insertVariable('buyer_phone')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_phone}}`} - Телефон</button>
                      <button onClick={() => insertVariable('buyer_representative')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_representative}}`} - В особі</button>
                      <button onClick={() => insertVariable('buyer_signature')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700 font-semibold">{`{{buyer_signature}}`} - Підпис ⭐</button>
                    </div>
                    <div className="col-span-2">
                      <p className="font-semibold text-blue-800 mb-2">Загальні:</p>
                      <div className="grid grid-cols-3 gap-1">
                        <button onClick={() => insertVariable('contract_number')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{contract_number}}`} - Номер</button>
                        <button onClick={() => insertVariable('contract_date')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{contract_date}}`} - Дата</button>
                        <button onClick={() => insertVariable('city')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{city}}`} - Місто</button>
                        <button onClick={() => insertVariable('end_date')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{end_date}}`} - Дата закінчення</button>
                        <button onClick={() => insertVariable('total_amount')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{total_amount}}`} - Сума (цифрами)</button>
                        <button onClick={() => insertVariable('total_amount_text')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700 font-semibold">{`{{total_amount_text}}`} - Сума прописом ⭐</button>
                        <button onClick={() => insertVariable('vat_note')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700 font-semibold">{`{{vat_note}}`} - Позначка ПДВ ⭐</button>
                        <button onClick={() => insertVariable('subject')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{subject}}`} - Предмет</button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Template editor */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Текст договору:</Label>
                <textarea
                  id="template-editor"
                  value={contractTemplate}
                  onChange={(e) => setContractTemplate(e.target.value)}
                  placeholder="Введіть текст договору з використанням змінних та маркерів вирівнювання..."
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                  style={{
                    fontFamily: templateSettings.fontFamily,
                    fontSize: `${templateSettings.fontSize}px`,
                    lineHeight: templateSettings.lineSpacing
                  }}
                />
                <p className="text-xs text-gray-500">
                  * Шаблон у форматі HTML з CSS стилями<br/>
                  * Використовуйте змінні {'{{'} variable_name {'}}'} для підстановки даних<br/>
                  * Після збереження шаблон застосовується для всіх нових договорів<br/>
                  * Клікніть на змінну вище для автоматичної вставки
                </p>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline" 
                onClick={resetContractTemplate}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Скинути до стандартного
              </Button>
              
              <Button 
                onClick={saveContractTemplate}
                className="btn-primary"
              >
                Зберегти шаблон
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Template Editor Dialog */}
        <Dialog open={showOrderTemplateEditor} onOpenChange={setShowOrderTemplateEditor}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Редактор шаблону замовлення
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Редагуйте HTML шаблон замовлення. Використовуйте змінні у форматі {`{{Назва_змінної}}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(90vh - 200px)'}}>
              
              {/* Available variables */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold text-blue-900">Доступні змінні (клікніть для вставки):</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-blue-800 mb-2">Постачальник (Мої дані):</p>
                      <button onClick={() => insertVariable('supplier_name', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('supplier_edrpou', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('supplier_address', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('supplier_iban', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('supplier_bank', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('supplier_mfo', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('supplier_email', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_email}}`} - Email</button>
                      <button onClick={() => insertVariable('supplier_phone', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{supplier_phone}}`} - Телефон</button>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-2">Покупець (Основні дані):</p>
                      <button onClick={() => insertVariable('buyer_name', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('buyer_edrpou', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('buyer_address', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('buyer_iban', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('buyer_bank', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('buyer_mfo', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('buyer_email', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_email}}`} - Email</button>
                      <button onClick={() => insertVariable('buyer_phone', 'order-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{buyer_phone}}`} - Телефон</button>
                    </div>
                    <div className="col-span-2">
                      <p className="font-semibold text-blue-800 mb-2">Загальні:</p>
                      <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => insertVariable('order_number', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{order_number}}`} - Номер</button>
                        <button onClick={() => insertVariable('order_date', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{order_date}}`} - Дата</button>
                        <button onClick={() => insertVariable('items_rows', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{items_rows}}`} - Рядки позицій</button>
                        <button onClick={() => insertVariable('total_net', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{total_net}}`} - Сума без ПДВ</button>
                        <button onClick={() => insertVariable('total_vat', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{total_vat}}`} - ПДВ</button>
                        <button onClick={() => insertVariable('total_gross', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{total_gross}}`} - Всього</button>
                        <button onClick={() => insertVariable('vat_rate', 'order-template-editor')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{vat_rate}}`} - Ставка ПДВ</button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Template editor */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">HTML шаблон замовлення:</Label>
                <textarea
                  id="order-template-editor"
                  value={orderTemplate}
                  onChange={(e) => setOrderTemplate(e.target.value)}
                  placeholder="Введіть HTML шаблон замовлення з використанням змінних..."
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  * Шаблон у форматі HTML з CSS стилями<br/>
                  * Використовуйте змінні {'{{'} variable_name {'}}'} для підстановки даних<br/>
                  * Після збереження шаблон застосовується для всіх нових замовлень<br/>
                  * Клікніть на змінну вище для автоматичної вставки
                </p>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline" 
                onClick={resetOrderTemplate}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Скинути до стандартного
              </Button>
              
              <Button 
                onClick={saveOrderTemplate}
                className="btn-primary"
              >
                Зберегти шаблон
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Act Template Editor Dialog */}
        <Dialog open={showActTemplateEditor} onOpenChange={setShowActTemplateEditor}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl font-bold">
                Редактор шаблону акту
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Редагуйте HTML шаблон акту наданих послуг. Використовуйте змінні у форматі {`{{Назва_змінної}}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(90vh - 200px)'}}>
              
              {/* Available variables */}
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold text-purple-900">Доступні змінні (клікніть для вставки):</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-purple-800 mb-2">Виконавець / Постачальник (Мої дані):</p>
                      <button onClick={() => insertVariable('supplier_name', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('supplier_edrpou', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('supplier_address', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('supplier_iban', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('supplier_bank', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('supplier_mfo', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('supplier_email', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_email}}`} - Email</button>
                      <button onClick={() => insertVariable('supplier_phone', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_phone}}`} - Телефон</button>
                      <button onClick={() => insertVariable('supplier_representative', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_representative}}`} - В особі</button>
                      <button onClick={() => insertVariable('supplier_signature', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{supplier_signature}}`} - Підпис</button>
                    </div>
                    <div>
                      <p className="font-semibold text-purple-800 mb-2">Замовник / Покупець (Основні дані):</p>
                      <button onClick={() => insertVariable('buyer_name', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_name}}`} - Назва</button>
                      <button onClick={() => insertVariable('buyer_edrpou', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_edrpou}}`} - ЄДРПОУ</button>
                      <button onClick={() => insertVariable('buyer_address', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_address}}`} - Адреса</button>
                      <button onClick={() => insertVariable('buyer_iban', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_iban}}`} - IBAN</button>
                      <button onClick={() => insertVariable('buyer_bank', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_bank}}`} - Банк</button>
                      <button onClick={() => insertVariable('buyer_mfo', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_mfo}}`} - МФО</button>
                      <button onClick={() => insertVariable('buyer_email', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_email}}`} - Email</button>
                      <button onClick={() => insertVariable('buyer_phone', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_phone}}`} - Телефон</button>
                      <button onClick={() => insertVariable('buyer_representative', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_representative}}`} - В особі</button>
                      <button onClick={() => insertVariable('buyer_signature', 'act-template-editor')} className="block text-left w-full px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{buyer_signature}}`} - Підпис</button>
                    </div>
                    <div className="col-span-2">
                      <p className="font-semibold text-purple-800 mb-2">Загальні:</p>
                      <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => insertVariable('act_number', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{act_number}}`} - Номер акту</button>
                        <button onClick={() => insertVariable('act_date', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{act_date}}`} - Дата</button>
                        <button onClick={() => insertVariable('basis', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{basis}}`} - Підстава</button>
                        <button onClick={() => insertVariable('items_rows', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{items_rows}}`} - Рядки послуг</button>
                        <button onClick={() => insertVariable('total_net', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{total_net}}`} - Сума без ПДВ</button>
                        <button onClick={() => insertVariable('total_vat', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{total_vat}}`} - ПДВ</button>
                        <button onClick={() => insertVariable('total_gross', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{total_gross}}`} - Всього</button>
                        <button onClick={() => insertVariable('vat_rate', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{vat_rate}}`} - Ставка ПДВ</button>
                        <button onClick={() => insertVariable('total_amount_text', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{total_amount_text}}`} - Сума прописом</button>
                        <button onClick={() => insertVariable('vat_note', 'act-template-editor')} className="text-left px-2 py-1 hover:bg-purple-100 rounded text-gray-700">{`{{vat_note}}`} - Примітка ПДВ</button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Template editor */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">HTML шаблон акту:</Label>
                <textarea
                  id="act-template-editor"
                  value={actTemplate}
                  onChange={(e) => setActTemplate(e.target.value)}
                  placeholder="Введіть HTML шаблон акту з використанням змінних..."
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  * Шаблон у форматі HTML з CSS стилями<br/>
                  * Використовуйте змінні {'{{'} variable_name {'}}'} для підстановки даних<br/>
                  * Після збереження шаблон застосовується для всіх нових актів<br/>
                  * Клікніть на змінну вище для автоматичної вставки
                </p>
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button 
                variant="outline" 
                onClick={resetActTemplate}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Скинути до стандартного
              </Button>
              
              <Button 
                onClick={saveActTemplate}
                className="btn-primary"
              >
                Зберегти шаблон
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <footer className="mt-16 py-6 border-t border-gray-200/50">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>Система Управління Документами © 2025</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
