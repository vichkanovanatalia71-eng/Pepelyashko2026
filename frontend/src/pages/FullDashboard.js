import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  LogOut, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Users, 
  Receipt, 
  Loader2, 
  Package, 
  FileSignature, 
  Code,
  Eye,
  Mail,
  Download,
  FileCheck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FullDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [counterparties, setCounterparties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [acts, setActs] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [orders, setOrders] = useState([]);
  const [contracts, setContracts] = useState([]);
  
  // Counterparty form - with all fields
  const [counterpartyForm, setCounterpartyForm] = useState({
    edrpou: '',
    representative_name: '',
    email: '',
    phone: '',
    iban: '',
    contract_type: '',
    director_position: '',
    director_name: '',
    legal_address: '',
    bank: '',
    mfo: '',
    position: '',
    represented_by: '',
    signature: ''
  });
  
  // Dialog for viewing counterparty details
  const [showCounterpartyDialog, setShowCounterpartyDialog] = useState(false);
  const [viewingCounterparty, setViewingCounterparty] = useState(null);
  
  // Document form
  const [documentForm, setDocumentForm] = useState({
    counterparty_edrpou: '',
    items: [{ name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }],
    total_amount: 0,
    based_on_order: ''
  });
  
  // Contract form
  const [contractForm, setContractForm] = useState({
    counterparty_edrpou: '',
    contract_type: '',
    subject: '',
    amount: 0,
    based_on_order: ''
  });
  
  // Search states
  const [searchEdrpou, setSearchEdrpou] = useState('');
  const [foundCounterparty, setFoundCounterparty] = useState(null);
  
  // Selected counterparty for viewing documents
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [counterpartyDocuments, setCounterpartyDocuments] = useState(null);
  
  // Order selection dialog
  const [showOrderSelectionDialog, setShowOrderSelectionDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDocTypes, setSelectedDocTypes] = useState({
    invoice: false,
    act: false,
    waybill: false,
    contract: false
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        counterpartiesRes,
        invoicesRes,
        actsRes,
        waybillsRes,
        ordersRes,
        contractsRes
      ] = await Promise.all([
        axios.get(`${API_URL}/api/counterparties`),
        axios.get(`${API_URL}/api/invoices`),
        axios.get(`${API_URL}/api/acts`),
        axios.get(`${API_URL}/api/waybills`),
        axios.get(`${API_URL}/api/orders`),
        axios.get(`${API_URL}/api/contracts`)
      ]);

      setCounterparties(counterpartiesRes.data);
      setInvoices(invoicesRes.data);
      setActs(actsRes.data);
      setWaybills(waybillsRes.data);
      setOrders(ordersRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  // Counterparty functions
  const handleCounterpartySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/counterparties`, counterpartyForm);
      toast.success('Контрагента успішно створено!');
      
      // Reset form
      setCounterpartyForm({
        edrpou: '',
        representative_name: '',
        email: '',
        phone: '',
        iban: '',
        contract_type: '',
        director_position: '',
        director_name: '',
        legal_address: '',
        bank: '',
        mfo: '',
        position: '',
        represented_by: '',
        signature: ''
      });
      
      // Reload data
      await loadAllData();
    } catch (error) {
      console.error('Error creating counterparty:', error);
      toast.error(error.response?.data?.detail || 'Помилка створення контрагента');
    } finally {
      setLoading(false);
    }
  };

  const searchCounterparty = async () => {
    if (!searchEdrpou) {
      toast.error('Введіть ЄДРПОУ');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/counterparties/${searchEdrpou}`);
      setFoundCounterparty(response.data);
      toast.success('Контрагента знайдено!');
    } catch (error) {
      console.error('Error searching counterparty:', error);
      toast.error('Контрагента не знайдено');
      setFoundCounterparty(null);
    }
  };

  const viewCounterpartyDetails = async (counterparty) => {
    setViewingCounterparty(counterparty);
    setShowCounterpartyDialog(true);
    
    try {
      const response = await axios.get(`${API_URL}/api/counterparties/${counterparty.edrpou}/documents`);
      setCounterpartyDocuments(response.data);
    } catch (error) {
      console.error('Error loading counterparty documents:', error);
      toast.error('Помилка завантаження документів');
    }
  };
  
  const closeCounterpartyDialog = () => {
    setShowCounterpartyDialog(false);
    setViewingCounterparty(null);
    setCounterpartyDocuments(null);
  };

  // Document item management
  const addItem = () => {
    setDocumentForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    setDocumentForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const total = newItems.reduce((sum, item) => sum + item.amount, 0);
      return {
        ...prev,
        items: newItems,
        total_amount: total
      };
    });
  };

  const updateItem = (index, field, value) => {
    setDocumentForm(prev => {
      const newItems = [...prev.items];
      newItems[index][field] = value;
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'price') {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].price) || 0;
        newItems[index].amount = qty * price;
      }
      
      // Calculate total
      const total = newItems.reduce((sum, item) => sum + item.amount, 0);
      
      return {
        ...prev,
        items: newItems,
        total_amount: total
      };
    });
  };

  // Create document
  const createDocument = async (endpoint, docType) => {
    if (!foundCounterparty) {
      toast.error('Спочатку знайдіть контрагента');
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        counterparty_edrpou: foundCounterparty.edrpou,
        items: documentForm.items,
        total_amount: documentForm.total_amount,
        based_on_order: documentForm.based_on_order || null
      };

      await axios.post(`${API_URL}/api/${endpoint}`, payload);
      toast.success(`${docType} успішно створено!`);
      
      // Reset form
      setDocumentForm({
        counterparty_edrpou: '',
        items: [{ name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }],
        total_amount: 0,
        based_on_order: ''
      });
      setSearchEdrpou('');
      setFoundCounterparty(null);
      
      // Reload data
      await loadAllData();
    } catch (error) {
      console.error(`Error creating ${docType}:`, error);
      toast.error(error.response?.data?.detail || `Помилка створення ${docType}`);
    } finally {
      setLoading(false);
    }
  };

  // Create contract
  const createContract = async () => {
    if (!foundCounterparty) {
      toast.error('Спочатку знайдіть контрагента');
      return;
    }

    if (!contractForm.subject || !contractForm.amount) {
      toast.error('Заповніть всі поля договору');
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        counterparty_edrpou: foundCounterparty.edrpou,
        contract_type: contractForm.contract_type || foundCounterparty.contract_type,
        subject: contractForm.subject,
        amount: parseFloat(contractForm.amount),
        based_on_order: contractForm.based_on_order || null
      };

      await axios.post(`${API_URL}/api/contracts`, payload);
      toast.success('Договір успішно створено!');
      
      // Reset form
      setContractForm({
        counterparty_edrpou: '',
        contract_type: '',
        subject: '',
        amount: 0,
        based_on_order: ''
      });
      setSearchEdrpou('');
      setFoundCounterparty(null);
      
      // Reload data
      await loadAllData();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error(error.response?.data?.detail || 'Помилка створення договору');
    } finally {
      setLoading(false);
    }
  };

  // Create documents from order
  const handleCreateFromOrder = async () => {
    if (!selectedOrder) return;
    
    const docsToCreate = Object.entries(selectedDocTypes).filter(([_, selected]) => selected);
    
    if (docsToCreate.length === 0) {
      toast.error('Оберіть хоча б один тип документа');
      return;
    }

    setLoading(true);
    
    try {
      for (const [docType, _] of docsToCreate) {
        const endpoint = docType === 'contract' ? 'contracts' : `${docType}s`;
        
        if (docType === 'contract') {
          await axios.post(`${API_URL}/api/${endpoint}`, {
            counterparty_edrpou: selectedOrder.counterparty_edrpou,
            contract_type: '',
            subject: `Договір на основі замовлення ${selectedOrder.number}`,
            amount: selectedOrder.total_amount,
            based_on_order: selectedOrder.number
          });
        } else {
          await axios.post(`${API_URL}/api/${endpoint}`, {
            counterparty_edrpou: selectedOrder.counterparty_edrpou,
            items: selectedOrder.items,
            total_amount: selectedOrder.total_amount,
            based_on_order: selectedOrder.number
          });
        }
      }
      
      toast.success('Документи успішно створено!');
      setShowOrderSelectionDialog(false);
      setSelectedOrder(null);
      setSelectedDocTypes({
        invoice: false,
        act: false,
        waybill: false,
        contract: false
      });
      
      await loadAllData();
    } catch (error) {
      console.error('Error creating documents from order:', error);
      toast.error('Помилка створення документів');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Ви успішно вийшли з системи');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Система Управління Документами
              </h1>
              <p className="text-sm text-gray-600">
                Вітаємо, {user?.full_name || user?.email}
                {user?.company_name && ` | ${user.company_name}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/templates')}
              >
                <Code className="w-4 h-4 mr-2" />
                Шаблони
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Вийти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="counterparties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="counterparties">
              <Users className="w-4 h-4 mr-2" />
              Контрагенти
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="w-4 h-4 mr-2" />
              Рахунки
            </TabsTrigger>
            <TabsTrigger value="acts">
              <FileCheck className="w-4 h-4 mr-2" />
              Акти
            </TabsTrigger>
            <TabsTrigger value="waybills">
              <Package className="w-4 h-4 mr-2" />
              Накладні
            </TabsTrigger>
            <TabsTrigger value="orders">
              <FileText className="w-4 h-4 mr-2" />
              Замовлення
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileSignature className="w-4 h-4 mr-2" />
              Договори
            </TabsTrigger>
          </TabsList>

          {/* Counterparties Tab */}
          <TabsContent value="counterparties" className="space-y-6">
            {/* Create Counterparty Form */}
            <Card>
              <CardHeader>
                <CardTitle>Створити Контрагента</CardTitle>
                <CardDescription>Додайте нового бізнес-партнера</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCounterpartySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edrpou">ЄДРПОУ *</Label>
                      <Input
                        id="edrpou"
                        value={counterpartyForm.edrpou}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, edrpou: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="representative_name">Назва *</Label>
                      <Input
                        id="representative_name"
                        value={counterpartyForm.representative_name}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, representative_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={counterpartyForm.email}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Телефон *</Label>
                      <Input
                        id="phone"
                        value={counterpartyForm.phone}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, phone: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="iban">IBAN *</Label>
                      <Input
                        id="iban"
                        value={counterpartyForm.iban}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, iban: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="director_name">ПІБ керівника</Label>
                      <Input
                        id="director_name"
                        value={counterpartyForm.director_name}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, director_name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Збереження...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" /> Створити Контрагента</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Counterparties List */}
            <Card>
              <CardHeader>
                <CardTitle>Список Контрагентів ({counterparties.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
                  </div>
                ) : counterparties.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Немає контрагентів. Створіть першого!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {counterparties.map((counterparty) => (
                      <Card key={counterparty._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{counterparty.representative_name}</p>
                              <p className="text-sm text-gray-600">ЄДРПОУ: {counterparty.edrpou}</p>
                              <p className="text-sm text-gray-600">
                                {counterparty.email} | {counterparty.phone}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => viewCounterpartyDocuments(counterparty)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Переглянути документи
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Створити Рахунок</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); createDocument('invoices', 'Рахунок'); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Пошук контрагента</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="ЄДРПОУ"
                      />
                      <Button type="button" onClick={searchCounterparty}>
                        <Search className="w-4 h-4 mr-2" />
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className="p-3 bg-teal-50 border rounded">
                        <p className="font-medium">{foundCounterparty.representative_name}</p>
                        <p className="text-sm text-gray-600">ЄДРПОУ: {foundCounterparty.edrpou}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Товари/Послуги</Label>
                      <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Додати
                      </Button>
                    </div>

                    {documentForm.items.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs">Назва</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Одиниця</Label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Кількість</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Ціна</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Сума</Label>
                            <Input
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
                            className="w-full mt-2"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Видалити
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>

                  <div className="p-4 bg-teal-50 border rounded">
                    <div className="flex justify-between">
                      <span className="font-semibold">Загальна сума:</span>
                      <span className="text-xl font-bold text-teal-700">
                        {documentForm.total_amount.toFixed(2)} грн
                      </span>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading || !foundCounterparty} className="w-full">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      <>Створити Рахунок</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список Рахунків ({invoices.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Немає рахунків</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <Card key={invoice._id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">№{invoice.number}</p>
                              <p className="text-sm text-gray-600">{invoice.counterparty_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(invoice.date).toLocaleDateString('uk-UA')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{invoice.total_amount} грн</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acts, Waybills, Orders, Contracts tabs similar structure */}
          <TabsContent value="acts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Список Актів ({acts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {acts.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Немає актів</p>
                ) : (
                  <div className="space-y-2">
                    {acts.map((act) => (
                      <Card key={act._id}>
                        <CardContent className="p-4">
                          <p className="font-medium">№{act.number}</p>
                          <p className="text-sm text-gray-600">{act.counterparty_name}</p>
                          <p className="font-bold">{act.total_amount} грн</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waybills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Список Накладних ({waybills.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {waybills.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Немає накладних</p>
                ) : (
                  <div className="space-y-2">
                    {waybills.map((waybill) => (
                      <Card key={waybill._id}>
                        <CardContent className="p-4">
                          <p className="font-medium">№{waybill.number}</p>
                          <p className="text-sm text-gray-600">{waybill.counterparty_name}</p>
                          <p className="font-bold">{waybill.total_amount} грн</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Список Замовлень ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Немає замовлень</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <Card key={order._id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">№{order.number}</p>
                              <p className="text-sm text-gray-600">{order.counterparty_name}</p>
                              <p className="font-bold">{order.total_amount} грн</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderSelectionDialog(true);
                              }}
                            >
                              Створити документи
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Список Договорів ({contracts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Немає договорів</p>
                ) : (
                  <div className="space-y-2">
                    {contracts.map((contract) => (
                      <Card key={contract._id}>
                        <CardContent className="p-4">
                          <p className="font-medium">№{contract.number}</p>
                          <p className="text-sm text-gray-600">{contract.counterparty_name}</p>
                          <p className="text-sm">{contract.subject}</p>
                          <p className="font-bold">{contract.amount} грн</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Selection Dialog */}
      <Dialog open={showOrderSelectionDialog} onOpenChange={setShowOrderSelectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Створити документи на основі замовлення</DialogTitle>
            <DialogDescription>
              Замовлення №{selectedOrder?.number} | {selectedOrder?.counterparty_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Оберіть типи документів для створення:</p>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.invoice}
                  onChange={(e) => setSelectedDocTypes({...selectedDocTypes, invoice: e.target.checked})}
                />
                <Receipt className="w-4 h-4" />
                <span>Рахунок</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.act}
                  onChange={(e) => setSelectedDocTypes({...selectedDocTypes, act: e.target.checked})}
                />
                <FileCheck className="w-4 h-4" />
                <span>Акт</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.waybill}
                  onChange={(e) => setSelectedDocTypes({...selectedDocTypes, waybill: e.target.checked})}
                />
                <Package className="w-4 h-4" />
                <span>Накладна</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.contract}
                  onChange={(e) => setSelectedDocTypes({...selectedDocTypes, contract: e.target.checked})}
                />
                <FileSignature className="w-4 h-4" />
                <span>Договір</span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderSelectionDialog(false)}>
              Скасувати
            </Button>
            <Button onClick={handleCreateFromOrder} disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
              ) : (
                <>Створити</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FullDashboard;
