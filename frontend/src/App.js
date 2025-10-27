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
import { Plus, Trash2, Search, FileText, Users, Receipt, Loader2, Package, FileSignature, ArrowLeft, Eye } from 'lucide-react';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  
  // Document creation from counterparty view
  const [showDocCreateDialog, setShowDocCreateDialog] = useState(false);
  const [docTypeToCreate, setDocTypeToCreate] = useState('');

  useEffect(() => {
    fetchCounterparties();
  }, []);

  const fetchCounterparties = async () => {
    try {
      const response = await axios.get(`${API}/counterparties`);
      setCounterparties(response.data);
    } catch (error) {
      console.error('Error fetching counterparties:', error);
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
      const response = await axios.post(`${API}/${endpoint}`, documentForm);
      
      if (endpoint === 'orders') {
        setOrderData({
          ...documentForm,
          document_number: response.data.document_number
        });
        setShowOrderDialog(true);
        toast.success(response.data.message || `${docType} успішно створено!`);
      } else {
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
      if (selectedDocs.invoice) {
        try {
          await axios.post(`${API}/invoices`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Рахунок');
        }
      }
      
      if (selectedDocs.act) {
        try {
          await axios.post(`${API}/acts`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Акт');
        }
      }
      
      if (selectedDocs.waybill) {
        try {
          await axios.post(`${API}/waybills`, orderData);
          successCount++;
        } catch (e) {
          errors.push('Видаткова накладна');
        }
      }
      
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

  const DocumentForm = ({ endpoint, docType, title }) => (
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
                        <Label className="text-sm text-gray-600">Ім'я представника</Label>
                        <p className="text-lg font-semibold">{selectedCounterparty.representative_name}</p>
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
                        <Label className="text-sm text-gray-600">IBAN</Label>
                        <p className="text-lg">{selectedCounterparty.iban}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Тип договору</Label>
                        <span className="contract-badge">{selectedCounterparty.contract_type}</span>
                      </div>
                      {selectedCounterparty.director_position && (
                        <div>
                          <Label className="text-sm text-gray-600">Посада керівника</Label>
                          <p className="text-lg">{selectedCounterparty.director_position}</p>
                        </div>
                      )}
                      {selectedCounterparty.director_name && (
                        <div>
                          <Label className="text-sm text-gray-600">ПІБ керівника</Label>
                          <p className="text-lg">{selectedCounterparty.director_name}</p>
                        </div>
                      )}
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
                              <div key={idx} className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                              <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                              <div key={idx} className="p-3 bg-orange-50 rounded-lg">
                                <p className="text-sm">№{doc.number} від {doc.date} | Сума: {doc.total_amount} грн</p>
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
                              <div key={idx} className="p-3 bg-teal-50 rounded-lg">
                                <p className="text-sm">№{doc.number} від {doc.date} | {doc.subject} | Сума: {doc.amount} грн</p>
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
            <DocumentForm endpoint="orders" docType="Замовлення" title="Створення Замовлення" />
          </TabsContent>

          <TabsContent value="invoices" data-testid="invoices-content">
            <DocumentForm endpoint="invoices" docType="Рахунок" title="Створення Рахунку" />
          </TabsContent>

          <TabsContent value="acts" data-testid="acts-content">
            <DocumentForm endpoint="acts" docType="Акт" title="Створення Акту Виконаних Робіт" />
          </TabsContent>

          <TabsContent value="waybills" data-testid="waybills-content">
            <DocumentForm endpoint="waybills" docType="Видаткова Накладна" title="Створення Видаткової Накладної" />
          </TabsContent>

          <TabsContent value="contracts" data-testid="contracts-content">
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
                    const response = await axios.post(`${API}/contracts`, {
                      counterparty_edrpou: searchEdrpou,
                      subject: contractForm.subject,
                      amount: contractForm.amount
                    });
                    toast.success(response.data.message || 'Договір успішно створено!');
                    
                    setContractForm({ subject: '', amount: 0 });
                    setSearchEdrpou('');
                    setFoundCounterparty(null);
                  } catch (error) {
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
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <p className="text-sm font-medium text-teal-900">
                          {foundCounterparty.representative_name}
                        </p>
                        <p className="text-xs text-teal-700">
                          {foundCounterparty.email} | {foundCounterparty.phone}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract-subject">Предмет договору *</Label>
                    <Input
                      id="contract-subject"
                      value={contractForm.subject}
                      onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                      placeholder="Наприклад: Постачання товарів, Надання послуг..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract-amount">Сума договору (грн) *</Label>
                    <Input
                      id="contract-amount"
                      type="number"
                      step="0.01"
                      value={contractForm.amount}
                      onChange={(e) => setContractForm({...contractForm, amount: parseFloat(e.target.value)})}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty}
                    className="w-full btn-primary py-6 text-lg"
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
                disabled={loading || (!selectedDocs.invoice && !selectedDocs.act && !selectedDocs.waybill && !selectedDocs.contract)}
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
