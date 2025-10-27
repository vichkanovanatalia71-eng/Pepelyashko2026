import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Plus, Trash2, Search, FileText, Users, Receipt, Loader2 } from 'lucide-react';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState([]);
  
  // Counterparty form state
  const [counterpartyForm, setCounterpartyForm] = useState({
    edrpou: '',
    representative_name: '',
    email: '',
    phone: '',
    iban: '',
    contract_type: 'Класичний'
  });

  // Document form state
  const [documentForm, setDocumentForm] = useState({
    counterparty_edrpou: '',
    items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
    total_amount: 0
  });

  const [searchEdrpou, setSearchEdrpou] = useState('');
  const [foundCounterparty, setFoundCounterparty] = useState(null);

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
        contract_type: 'Класичний'
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
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'price') {
        const quantity = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].price) || 0;
        newItems[index].amount = quantity * price;
      }
      
      // Calculate total
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
      toast.success(response.data.message || `${docType} успішно створено!`);
      
      // Reset form
      setDocumentForm({
        counterparty_edrpou: '',
        items: [{ name: '', unit: '', quantity: 0, price: 0, amount: 0 }],
        total_amount: 0
      });
      setSearchEdrpou('');
      setFoundCounterparty(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Помилка при створенні ${docType}`);
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
          {/* Search counterparty */}
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

          {/* Items */}
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

          {/* Total */}
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
      
      {/* Header */}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="counterparties" className="w-full" data-testid="main-tabs">
          <TabsList className="tabs-list grid w-full grid-cols-2 sm:grid-cols-4 mb-8">
            <TabsTrigger value="counterparties" data-testid="tab-counterparties">
              <Users className="w-4 h-4 mr-2" />
              Контрагенти
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
          </TabsList>

          {/* Counterparties Tab */}
          <TabsContent value="counterparties" data-testid="counterparties-content">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl" data-testid="counterparty-form-title">Створення Контрагента</CardTitle>
                <CardDescription data-testid="counterparty-form-description">Додайте нового контрагента до системи</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCounterpartySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edrpou" data-testid="edrpou-label">Код ЄДРПОУ *</Label>
                      <Input
                        id="edrpou"
                        data-testid="edrpou-input"
                        value={counterpartyForm.edrpou}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, edrpou: e.target.value})}
                        placeholder="12345678"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representative_name" data-testid="representative-name-label">Ім'я Представника *</Label>
                      <Input
                        id="representative_name"
                        data-testid="representative-name-input"
                        value={counterpartyForm.representative_name}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, representative_name: e.target.value})}
                        placeholder="Іван Петренко"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" data-testid="email-label">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="email-input"
                        value={counterpartyForm.email}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, email: e.target.value})}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" data-testid="phone-label">Телефон *</Label>
                      <Input
                        id="phone"
                        data-testid="phone-input"
                        value={counterpartyForm.phone}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, phone: e.target.value})}
                        placeholder="+380XXXXXXXXX"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iban" data-testid="iban-label">IBAN *</Label>
                    <Input
                      id="iban"
                      data-testid="iban-input"
                      value={counterpartyForm.iban}
                      onChange={(e) => setCounterpartyForm({...counterpartyForm, iban: e.target.value})}
                      placeholder="UA123456789012345678901234567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract_type" data-testid="contract-type-label">Тип Договору *</Label>
                    <Select
                      value={counterpartyForm.contract_type}
                      onValueChange={(value) => setCounterpartyForm({...counterpartyForm, contract_type: value})}
                    >
                      <SelectTrigger data-testid="contract-type-select">
                        <SelectValue placeholder="Оберіть тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Класичний" data-testid="contract-type-classic">Класичний</SelectItem>
                        <SelectItem value="Некласичний" data-testid="contract-type-non-classic">Некласичний</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    data-testid="submit-counterparty-btn"
                    className="w-full btn-primary py-6 text-lg"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      'Створити Контрагента'
                    )}
                  </Button>
                </form>

                {/* Counterparties List */}
                {counterparties.length > 0 && (
                  <div className="mt-8 space-y-3" data-testid="counterparties-list">
                    <h3 className="text-lg font-semibold" data-testid="counterparties-list-title">Список Контрагентів ({counterparties.length})</h3>
                    <div className="grid gap-3">
                      {counterparties.map((cp, index) => (
                        <div key={index} className="counterparty-card p-4" data-testid={`counterparty-card-${index}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-lg" data-testid={`counterparty-name-${index}`}>{cp.representative_name}</p>
                              <p className="text-sm text-gray-600" data-testid={`counterparty-edrpou-${index}`}>ЄДРПОУ: {cp.edrpou}</p>
                              <p className="text-sm text-gray-600" data-testid={`counterparty-contact-${index}`}>{cp.email} | {cp.phone}</p>
                            </div>
                            <span className="contract-badge" data-testid={`counterparty-contract-type-${index}`}>
                              {cp.contract_type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" data-testid="invoices-content">
            <DocumentForm endpoint="invoices" docType="Рахунок" title="Створення Рахунку" />
          </TabsContent>

          {/* Acts Tab */}
          <TabsContent value="acts" data-testid="acts-content">
            <DocumentForm endpoint="acts" docType="Акт" title="Створення Акту Виконаних Робіт" />
          </TabsContent>

          {/* Waybills Tab */}
          <TabsContent value="waybills" data-testid="waybills-content">
            <DocumentForm endpoint="waybills" docType="Видаткова Накладна" title="Створення Видаткової Накладної" />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-gray-200/50">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p data-testid="footer-text">Система Управління Документами © 2025</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
