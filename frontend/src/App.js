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
import { Plus, Trash2, Search, FileText, Users, Receipt, Loader2, Package, FileSignature, ArrowLeft, Eye, X } from 'lucide-react';
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
    amount: 0,
    items: [{ name: '', unit: 'шт', quantity: 0, price: 0, amount: 0 }]
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

  // Contract template
  const [contractTemplate, setContractTemplate] = useState('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSettings, setTemplateSettings] = useState({
    fontSize: 12,
    fontFamily: 'Times New Roman',
    lineSpacing: 1.5,
    indent: 0
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

  const insertVariable = (variableName) => {
    const textarea = document.querySelector('#template-editor');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const variable = `{{${variableName}}}`;
    const newText = contractTemplate.substring(0, start) + variable + contractTemplate.substring(start);
    setContractTemplate(newText);
    
    // Restore cursor position after variable
    setTimeout(() => {
      textarea.selectionStart = start + variable.length;
      textarea.selectionEnd = start + variable.length;
      textarea.focus();
    }, 0);
  };

  useEffect(() => {
    fetchCounterparties();
    fetchAllDocuments();
    loadContractTemplate();
  }, []);

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
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };
  
  const loadContractTemplate = () => {
    const savedTemplate = localStorage.getItem('contractTemplate');
    const savedSettings = localStorage.getItem('contractTemplateSettings');
    
    if (savedTemplate) {
      setContractTemplate(savedTemplate);
    } else {
      // Set default template with requisites
      const defaultTemplate = `[align:center][b]ДОГОВІР ПОСТАЧАННЯ ТОВАРІВ ТА/АБО НАДАННЯ ПОСЛУГ[/b][/align]

[align:center]№ {{contract_number}} від {{contract_date}}[/align]

[align:left]{{city}}[/align]

[align:justify]Цей договір укладено між Постачальником та Покупцем на постачання товарів та/або надання послуг.[/align]

[b]ПРЕДМЕТ ДОГОВОРУ:[/b] {{subject}}

[b]ЗАГАЛЬНА СУМА:[/b] {{total_amount}} грн

Договір діє до {{end_date}}.


[align:center][b]РЕКВІЗИТИ СТОРІН[/b][/align]

[b]ПОСТАЧАЛЬНИК:[/b]
{{supplier_name}}
Код ЄДРПОУ: {{supplier_edrpou}}
Юридична адреса: {{supplier_address}}
р/р (IBAN): {{supplier_iban}}
Банк: {{supplier_bank}}
МФО: {{supplier_mfo}}
Email: {{supplier_email}}
Телефон: {{supplier_phone}}
В особі: {{supplier_representative}}
Підпис: {{supplier_signature}}

[b]ПОКУПЕЦЬ:[/b]
{{buyer_name}}
Код ЄДРПОУ: {{buyer_edrpou}}
Юридична адреса: {{buyer_address}}
р/р (IBAN): {{buyer_iban}}
Банк: {{buyer_bank}}
МФО: {{buyer_mfo}}
Email: {{buyer_email}}
Телефон: {{buyer_phone}}
В особі: {{buyer_representative}}
Підпис: {{buyer_signature}}`;
      
      setContractTemplate(defaultTemplate);
    }
    
    if (savedSettings) {
      setTemplateSettings(JSON.parse(savedSettings));
    }
  };
  
  const saveContractTemplate = () => {
    localStorage.setItem('contractTemplate', contractTemplate);
    localStorage.setItem('contractTemplateSettings', JSON.stringify(templateSettings));
    toast.success('Шаблон договору збережено!');
    setShowTemplateEditor(false);
  };
  
  const resetContractTemplate = () => {
    if (window.confirm('Ви впевнені що хочете скинути шаблон до стандартного?')) {
      setContractTemplate('');
      setTemplateSettings({
        fontSize: 12,
        fontFamily: 'Times New Roman',
        lineSpacing: 1.5,
        indent: 0
      });
      localStorage.removeItem('contractTemplate');
      localStorage.removeItem('contractTemplateSettings');
      toast.success('Шаблон скинуто до стандартного');
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
    } catch (error) {
      toast.error('Контрагента не знайдено');
      setFoundCounterparty(null);
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
      if (endpoint === 'orders') {
        // Handle order creation (existing logic)
        const response = await axios.post(`${API}/${endpoint}`, documentForm);
        setOrderData({
          ...documentForm,
          document_number: response.data.document_number
        });
        setShowOrderDialog(true);
        toast.success(response.data.message || `${docType} успішно створено!`);
      } else if (['invoices', 'acts', 'waybills'].includes(endpoint)) {
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
                      <CardTitle className="text-xl">Документи контрагента</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {counterpartyDocuments.orders?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Замовлення ({counterpartyDocuments.orders.length})</h4>
                          <div className="space-y-2">
                            {counterpartyDocuments.orders.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                                    className="btn-secondary ml-2"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Переглянути
                                  </Button>
                                )}
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
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                                    className="btn-secondary ml-2"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Переглянути
                                  </Button>
                                )}
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
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                                    className="btn-secondary ml-2"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Переглянути
                                  </Button>
                                )}
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
                                <p className="text-sm">№{doc.number} від {doc.date} | {doc.subject} | Сума: {doc.amount} грн</p>
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
                                        counterpartyEmail: selectedCounterparty?.email || ''
                                      });
                                      setShowContractPreview(true);
                                    }}
                                    className="btn-secondary ml-2"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Переглянути
                                  </Button>
                                )}
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
                <CardDescription>Створіть новий договір з контрагентом</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  
                  if (!searchEdrpou) {
                    toast.error('Спочатку знайдіть контрагента');
                    setLoading(false);
                    return;
                  }

                  try {
                    // Generate PDF contract
                    const pdfResponse = await axios.post(`${API}/contracts/generate-pdf`, {
                      counterparty_edrpou: searchEdrpou,
                      subject: contractForm.subject,
                      items: contractForm.items,
                      total_amount: contractForm.amount,
                      custom_template: contractTemplate || null,
                      template_settings: templateSettings
                    });
                    
                    if (pdfResponse.data.success) {
                      // Set PDF data for preview
                      setContractPdfData({
                        ...pdfResponse.data,
                        counterpartyEmail: foundCounterparty?.email || ''
                      });
                      setContractEmailForm({
                        recipient: 'counterparty',
                        customEmail: '',
                        counterpartyEmail: foundCounterparty?.email || ''
                      });
                      
                      // Show dialog first, then toast
                      setTimeout(() => {
                        setShowContractPreview(true);
                        toast.success('Договір успішно згенеровано!');
                        
                        // Refresh all documents list
                        fetchAllDocuments();
                        
                        // Reset form
                        setContractForm({
                          subject: '',
                          amount: 0,
                          items: [{ name: '', unit: 'шт', quantity: 0, price: 0, amount: 0 }]
                        });
                        setSearchEdrpou('');
                        setFoundCounterparty(null);
                      }, 100);
                    }
                  } catch (error) {
                    console.error('Contract generation error:', error);
                    toast.error(error.response?.data?.detail || 'Помилка при створенні договору');
                  } finally {
                    setLoading(false);
                  }
                }} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="contract-search-edrpou">Пошук контрагента за ЄДРПОУ</Label>
                    <div className="flex gap-2">
                      <Input
                        id="contract-search-edrpou"
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
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {foundCounterparty.representative_name}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {foundCounterparty.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {foundCounterparty.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                ЄДРПОУ: {foundCounterparty.edrpou}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract-subject" className="text-sm font-medium text-gray-700">
                      Предмет договору *
                    </Label>
                    <Input
                      id="contract-subject"
                      value={contractForm.subject}
                      onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                      placeholder="Наприклад: Постачання товарів, Надання послуг..."
                      className="shadow-sm focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  {/* Items section */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Позиції товарів/послуг *</Label>
                    {contractForm.items && contractForm.items.map((item, index) => (
                      <div key={index} className="p-4 border border-gray-300 rounded-lg bg-gray-50 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">Позиція #{index + 1}</span>
                          {contractForm.items && contractForm.items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newItems = (contractForm.items || []).filter((_, i) => i !== index);
                                const newTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                                setContractForm({...contractForm, items: newItems, amount: newTotal});
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <Input
                          placeholder="Назва товару/послуги"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...(contractForm.items || [])];
                            newItems[index].name = e.target.value;
                            setContractForm({...contractForm, items: newItems});
                          }}
                          required
                        />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="шт, кг, л"
                            value={item.unit}
                            onChange={(e) => {
                              const newItems = [...(contractForm.items || [])];
                              newItems[index].unit = e.target.value;
                              setContractForm({...contractForm, items: newItems});
                            }}
                            required
                          />
                          
                          <Input
                            type="number"
                            placeholder="Кількість"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...(contractForm.items || [])];
                              newItems[index].quantity = parseFloat(e.target.value) || 0;
                              const price = newItems[index].price || 0;
                              const quantity = parseFloat(e.target.value) || 0;
                              newItems[index].amount = price * quantity;
                              const newTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                              setContractForm({...contractForm, items: newItems, amount: newTotal});
                            }}
                            required
                          />
                          
                          <Input
                            type="number"
                            placeholder="Ціна"
                            value={item.price}
                            onChange={(e) => {
                              const newItems = [...(contractForm.items || [])];
                              newItems[index].price = parseFloat(e.target.value) || 0;
                              const price = parseFloat(e.target.value) || 0;
                              const quantity = newItems[index].quantity || 0;
                              newItems[index].amount = price * quantity;
                              const newTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                              setContractForm({...contractForm, items: newItems, amount: newTotal});
                            }}
                            required
                          />
                        </div>
                        
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-700">
                            Сума: {(item.amount || 0).toFixed(2)} грн
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setContractForm({
                          ...contractForm,
                          items: [...(contractForm.items || []), { name: '', unit: 'шт', quantity: 0, price: 0, amount: 0 }]
                        });
                      }}
                      className="w-full border-dashed border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Додати позицію
                    </Button>
                  </div>

                  <div className="space-y-2 bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <Label className="text-sm font-bold text-amber-900">
                      Загальна сума договору: {(contractForm.amount || 0).toFixed(2)} грн
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty}
                    className="w-full btn-primary text-white font-semibold py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Збереження...</>
                    ) : (
                      'Створити Договір'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* List of all contracts */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Всі договори ({allContracts.length})</CardTitle>
                <CardDescription>Останні створені договори</CardDescription>
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
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100" style={{height: '500px'}}>
                  {contractPdfData.drive_view_link ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${contractPdfData.drive_file_id}/preview`}
                      style={{width: '100%', height: '100%', border: 'none'}}
                      title="Попередній перегляд договору"
                      allow="autoplay"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>PDF генерується... Оновіть сторінку для перегляду</p>
                    </div>
                  )}
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
                variant="outline" 
                onClick={() => {
                  const downloadLink = contractPdfData?.drive_download_link || `${API}/contracts/download/${contractPdfData?.pdf_filename}`;
                  window.open(downloadLink, '_blank');
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <FileText className="w-4 h-4 mr-2" />
                Завантажити PDF
              </Button>
              
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
                Попередній перегляд {currentDocType === 'invoice' ? 'рахунку' : currentDocType === 'act' ? 'акту' : 'накладної'} {documentPdfData?.[`${currentDocType}_number`]}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Перегляньте документ та надішліть його на email
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto" style={{maxHeight: 'calc(95vh - 200px)'}}>
              {/* PDF Preview */}
              {documentPdfData && (
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100" style={{height: '500px'}}>
                  {documentPdfData.drive_view_link ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${documentPdfData.drive_file_id}/preview`}
                      style={{width: '100%', height: '100%', border: 'none'}}
                      title="Попередній перегляд документу"
                      allow="autoplay"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>PDF генерується... Оновіть сторінку для перегляду</p>
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
              <Button 
                variant="outline" 
                onClick={() => {
                  const downloadLink = documentPdfData?.drive_download_link;
                  if (downloadLink) {
                    window.open(downloadLink, '_blank');
                  } else {
                    toast.error('Посилання для завантаження недоступне');
                  }
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <FileText className="w-4 h-4 mr-2" />
                Завантажити PDF
              </Button>
              
              <Button 
                onClick={() => {
                  toast.info('Функція відправки email для документів буде додана незабаром');
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
                }}
                disabled={loading}
                className="btn-primary"
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
              {/* Formatting toolbar - Sticky */}
              <div className="sticky top-0 z-10 bg-white pt-2 pb-2 -mt-2">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
                  <CardContent className="py-3">
                    <div className="space-y-3">
                      {/* Formatting buttons row */}
                      <div className="flex flex-wrap gap-2 items-center border-b border-blue-200 pb-2">
                        <Label className="text-sm font-semibold text-blue-900 mr-2">Форматування:</Label>
                        <button
                          type="button"
                          onClick={() => applyFormatting('bold')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 font-bold text-sm"
                          title="Жирний (виділіть текст)"
                        >
                          Ж
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormatting('italic')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 italic text-sm"
                          title="Курсив (виділіть текст)"
                        >
                          К
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormatting('underline')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 underline text-sm"
                          title="Підкреслення (виділіть текст)"
                        >
                          П
                        </button>
                        
                        <div className="w-px h-6 bg-blue-300 mx-1"></div>
                        
                        <Label className="text-sm font-semibold text-blue-900 mr-1">Вирівнювання:</Label>
                        <button
                          type="button"
                          onClick={() => insertAlignment('left')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 text-sm"
                          title="Вирівняти ліворуч"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => insertAlignment('center')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 text-sm"
                          title="Вирівняти по центру"
                        >
                          ↔
                        </button>
                        <button
                          type="button"
                          onClick={() => insertAlignment('right')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 text-sm"
                          title="Вирівняти праворуч"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => insertAlignment('justify')}
                          className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 text-sm"
                          title="Вирівняти по ширині"
                        >
                          ⇔
                        </button>
                      </div>
                      
                      {/* Font and paragraph settings row */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Font section */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-blue-900">Шрифт</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <select
                                value={templateSettings.fontFamily}
                                onChange={(e) => setTemplateSettings({...templateSettings, fontFamily: e.target.value})}
                                className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                              >
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Arial">Arial</option>
                                <option value="Calibri">Calibri</option>
                                <option value="DejaVu Sans">DejaVu Sans</option>
                              </select>
                            </div>
                            <div>
                              <select
                                value={templateSettings.fontSize}
                                onChange={(e) => setTemplateSettings({...templateSettings, fontSize: parseInt(e.target.value)})}
                                className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                              >
                                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24].map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        {/* Paragraph section */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-blue-900">Абзац</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-blue-700">Міжрядковий інтервал</Label>
                              <select
                                value={templateSettings.lineSpacing}
                                onChange={(e) => setTemplateSettings({...templateSettings, lineSpacing: parseFloat(e.target.value)})}
                                className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                              >
                                <option value="1">1.0</option>
                                <option value="1.15">1.15</option>
                                <option value="1.5">1.5</option>
                                <option value="2">2.0</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-blue-700">Відступ (см)</Label>
                              <input
                                type="number"
                                step="0.5"
                                value={templateSettings.indent}
                                onChange={(e) => setTemplateSettings({...templateSettings, indent: parseFloat(e.target.value) || 0})}
                                className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
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
                        <button onClick={() => insertVariable('total_amount')} className="text-left px-2 py-1 hover:bg-blue-100 rounded text-gray-700">{`{{total_amount}}`} - Сума</button>
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
                  * Якщо залишити порожнім, буде використовуватись стандартний шаблон<br/>
                  * Виділіть текст і натисніть кнопку вирівнювання для додавання маркерів
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
