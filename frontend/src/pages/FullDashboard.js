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
  FileCheck,
  Edit,
  Edit2,
  Settings,
  Sparkles
} from 'lucide-react';
import { documentThemes } from '../theme/documentThemes';
import '../styles/animations.css';
import InvoiceDialog from '../components/dialogs/InvoiceDialog';
import { InvoiceList, DocumentListGeneric } from '../components/documents';

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
    contract_type: 'Статуту', // Діє на підставі: Статуту, Довіреності, Виписка
    director_name: '',
    legal_address: '',
    bank: '',
    mfo: '',
    position: '',
    represented_by: '',
    signature: ''
  });
  
  // Loading state for EDRPOU search
  const [searchingEdrpou, setSearchingEdrpou] = useState(false);
  
  // Dialog for viewing counterparty details
  const [showCounterpartyDialog, setShowCounterpartyDialog] = useState(false);
  const [viewingCounterparty, setViewingCounterparty] = useState(null);
  const [editingCounterparty, setEditingCounterparty] = useState(false);
  
  // Email sending
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailType, setEmailType] = useState('counterparty');
  
  // Active tab for theme management
  const [activeTab, setActiveTab] = useState('counterparties');
  const currentTheme = documentThemes[activeTab] || documentThemes.counterparties; // 'counterparty' or 'order'
  
  // Order creation
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedCounterpartyForOrder, setSelectedCounterpartyForOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([
    { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }
  ]);
  
  // Order viewing/editing
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({
    date: '',
    counterparty_edrpou: '',
    counterparty_name: '',
    items: [],
    total_amount: 0
  });

  // Invoice viewing/editing
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(false);

  // Act viewing/editing
  const [showActDialog, setShowActDialog] = useState(false);
  const [viewingAct, setViewingAct] = useState(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [editingContract, setEditingContract] = useState(false);
  const [editingAct, setEditingAct] = useState(false);

  // Waybill viewing/editing
  const [showWaybillDialog, setShowWaybillDialog] = useState(false);
  const [viewingWaybill, setViewingWaybill] = useState(null);
  const [editingWaybill, setEditingWaybill] = useState(false);

  // Profile state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    phone: '',
    edrpou: '',
    representative_name: '',
    legal_address: '',
    iban: '',
    bank: '',
    mfo: '',
    director_name: '',
    director_position: '',
    position: '',
    represented_by: '',
    signature: '',
    contract_type: 'Статуту'
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [searchingEdrpouProfile, setSearchingEdrpouProfile] = useState(false);
  
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

  // Edit invoice form
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    date: '',
    items: [],
    total_amount: 0
  });
  
  // Search states
  const [searchEdrpou, setSearchEdrpou] = useState('');
  const [searchEdrpouInvoices, setSearchEdrpouInvoices] = useState('');
  const [searchEdrpouActs, setSearchEdrpouActs] = useState('');
  const [searchEdrpouWaybills, setSearchEdrpouWaybills] = useState('');
  const [searchEdrpouContracts, setSearchEdrpouContracts] = useState('');
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
    loadUserProfile();
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
        contract_type: 'Статуту',
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
    setEditingCounterparty(false);
  };

  const startEditingCounterparty = () => {
    if (viewingCounterparty) {
      // Normalize contract_type to valid dropdown values
      const validBases = ['Статуту', 'Довіреності', 'Виписка'];
      let basis = viewingCounterparty.contract_type || 'Статуту';
      
      // If the stored value is not in the dropdown, default to "Статуту"
      if (!validBases.includes(basis)) {
        basis = 'Статуту';
      }
      
      // Auto-regenerate "В особі" with current data
      let representedBy = viewingCounterparty.represented_by || '';
      
      // If we have position and director_name, always regenerate to ensure consistency
      if (viewingCounterparty.position && viewingCounterparty.director_name) {
        representedBy = generateRepresentedBy(
          viewingCounterparty.position,
          viewingCounterparty.director_name,
          basis
        );
      }
      
      // Auto-regenerate signature if we have director_name
      let signature = viewingCounterparty.signature || '';
      if (viewingCounterparty.director_name) {
        signature = generateSignature(viewingCounterparty.director_name);
      }
      
      // Load counterparty data into form
      setCounterpartyForm({
        edrpou: viewingCounterparty.edrpou,
        representative_name: viewingCounterparty.representative_name,
        email: viewingCounterparty.email,
        phone: viewingCounterparty.phone,
        iban: viewingCounterparty.iban,
        contract_type: basis,
        director_position: viewingCounterparty.director_position || '',
        director_name: viewingCounterparty.director_name || '',
        legal_address: viewingCounterparty.legal_address || '',
        bank: viewingCounterparty.bank || '',
        mfo: viewingCounterparty.mfo || '',
        position: viewingCounterparty.position || '',
        represented_by: representedBy,
        signature: signature
      });
      setEditingCounterparty(true);
    }
  };

  const saveCounterpartyChanges = async () => {
    setLoading(true);
    
    try {
      await axios.put(`${API_URL}/api/counterparties/${viewingCounterparty._id}`, counterpartyForm);
      toast.success('Контрагента успішно оновлено!');
      
      // Reload data and close dialog
      await loadAllData();
      closeCounterpartyDialog();
    } catch (error) {
      console.error('Error updating counterparty:', error);
      toast.error(error.response?.data?.detail || 'Помилка оновлення контрагента');
    } finally {
      setLoading(false);
    }
  };

  const cancelEditingCounterparty = () => {
    setEditingCounterparty(false);
    // Reset form
    setCounterpartyForm({
      edrpou: '',
      representative_name: '',
      email: '',
      phone: '',
      iban: '',
      contract_type: 'Статуту',
      director_position: '',
      director_name: '',
      legal_address: '',
      bank: '',
      mfo: '',
      position: '',
      represented_by: '',
      signature: ''
    });
  };

  const deleteCounterparty = async () => {
    if (!viewingCounterparty) return;
    
    // Confirm deletion
    if (!window.confirm(`Ви впевнені, що хочете видалити контрагента "${viewingCounterparty.representative_name}"?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.delete(`${API_URL}/api/counterparties/${viewingCounterparty._id}`);
      toast.success('Контрагента успішно видалено!');
      
      // Reload data and close dialog
      await loadAllData();
      closeCounterpartyDialog();
    } catch (error) {
      console.error('Error deleting counterparty:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення контрагента');
    } finally {
      setLoading(false);
    }
  };

  const downloadCounterpartyPDF = async () => {
    if (!viewingCounterparty) return;
    
    try {
      const response = await axios.get(
        `${API_URL}/api/counterparties/${viewingCounterparty._id}/pdf`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Картка_контрагента_${viewingCounterparty.edrpou}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF картку завантажено!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Помилка завантаження PDF');
    }
  };

  const previewCounterpartyPDF = async () => {
    if (!viewingCounterparty) return;
    
    try {
      const response = await axios.get(
        `${API_URL}/api/counterparties/${viewingCounterparty._id}/pdf`,
        { responseType: 'blob' }
      );
      
      // Open PDF in new tab for preview
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      toast.success('PDF відкрито для перегляду');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Помилка відкриття PDF');
    }
  };

  const openEmailDialog = () => {
    // Pre-fill with counterparty's email if available
    if (viewingCounterparty && viewingCounterparty.email) {
      setEmailRecipient(viewingCounterparty.email);
    } else {
      setEmailRecipient('');
    }
    setEmailType('counterparty');
    setShowEmailDialog(true);
  };

  const openInvoiceEmailDialog = async () => {
    if (viewingInvoice && viewingInvoice.counterparty_edrpou) {
      try {
        const counterparty = counterparties.find(cp => cp.edrpou === viewingInvoice.counterparty_edrpou);
        if (counterparty && counterparty.email) {
          setEmailRecipient(counterparty.email);
        } else {
          setEmailRecipient('');
        }
      } catch (error) {
        console.error('Error fetching counterparty email:', error);
        setEmailRecipient('');
      }
    } else {
      setEmailRecipient('');
    }
    setEmailType('invoice');
    setShowEmailDialog(true);
  };

  const openActEmailDialog = async () => {
    if (viewingAct && viewingAct.counterparty_edrpou) {
      try {
        const counterparty = counterparties.find(cp => cp.edrpou === viewingAct.counterparty_edrpou);
        if (counterparty && counterparty.email) {
          setEmailRecipient(counterparty.email);
        } else {
          setEmailRecipient('');
        }
      } catch (error) {
        console.error('Error fetching counterparty email:', error);
        setEmailRecipient('');
      }
    } else {
      setEmailRecipient('');
    }
    setEmailType('act');
    setShowEmailDialog(true);
  };

  const openWaybillEmailDialog = async () => {
    if (viewingWaybill && viewingWaybill.counterparty_edrpou) {
      try {
        const counterparty = counterparties.find(cp => cp.edrpou === viewingWaybill.counterparty_edrpou);
        if (counterparty && counterparty.email) {
          setEmailRecipient(counterparty.email);
        } else {
          setEmailRecipient('');
        }
      } catch (error) {
        console.error('Error fetching counterparty email:', error);
        setEmailRecipient('');
      }
    } else {
      setEmailRecipient('');
    }
    setEmailType('waybill');
    setShowEmailDialog(true);
  };

  const openOrderEmailDialog = async () => {
    // Try to get counterparty email for this order
    if (viewingOrder && viewingOrder.counterparty_edrpou) {
      try {
        const counterparty = counterparties.find(cp => cp.edrpou === viewingOrder.counterparty_edrpou);
        if (counterparty && counterparty.email) {
          setEmailRecipient(counterparty.email);
        } else {
          setEmailRecipient('');
        }
      } catch (error) {
        console.error('Error fetching counterparty email:', error);
        setEmailRecipient('');
      }
    } else {
      setEmailRecipient('');
    }
    setEmailType('order');
    setShowEmailDialog(true);
  };

  const closeEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailRecipient('');
    setEmailType('counterparty');
  };

  const sendCounterpartyEmail = async () => {
    if (!viewingCounterparty || !emailRecipient) {
      toast.error('Введіть email адресу');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRecipient)) {
      toast.error('Введіть коректний email');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/counterparties/${viewingCounterparty._id}/send-email`,
        { email: emailRecipient }
      );
      
      toast.success(`Картку відправлено на ${emailRecipient}`);
      closeEmailDialog();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  const sendOrderEmail = async () => {
    if (!viewingOrder || !emailRecipient) {
      toast.error('Введіть email адресу');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRecipient)) {
      toast.error('Введіть коректний email');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/orders/${viewingOrder._id}/send-email`,
        { email: emailRecipient }
      );
      
      toast.success(`Замовлення відправлено на ${emailRecipient}`);
      closeEmailDialog();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (emailType === 'order') {
      await sendOrderEmail();
    } else if (emailType === 'invoice') {
      await sendInvoiceEmail();
    } else if (emailType === 'act') {
      await sendActEmail();
    } else if (emailType === 'waybill') {
      await sendWaybillEmail();
    } else {
      await sendCounterpartyEmail();
    }
  };

  // Format date in Ukrainian format
  const formatDateUkrainian = (dateStr) => {
    if (!dateStr) return '—';
    
    const months = {
      1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
      5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
      9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
    };
    
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = months[date.getMonth() + 1];
      const year = date.getFullYear();
      
      return `${day.toString().padStart(2, '0')} ${month} ${year} року`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedCounterpartyForOrder) {
      toast.error('Оберіть контрагента');
      return;
    }
    
    // Validate items
    const validItems = orderItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Додайте хоча б один товар/послугу');
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate order number
      const nextNumber = orders.length > 0 
        ? String(Math.max(...orders.map(o => parseInt(o.number) || 0)) + 1).padStart(4, '0')
        : '0001';
      
      // Calculate total
      const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
      
      const orderData = {
        number: nextNumber,
        counterparty_edrpou: selectedCounterpartyForOrder.edrpou,
        counterparty_name: selectedCounterpartyForOrder.representative_name,
        items: validItems,
        total_amount: totalAmount,
        date: new Date().toISOString().split('T')[0]
      };
      
      await axios.post(`${API_URL}/api/orders`, orderData);
      
      toast.success(`Замовлення №${nextNumber} створено!`);
      
      // Reset form
      setSelectedCounterpartyForOrder(null);
      setOrderItems([{ name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]);
      
      // Reload data
      await loadAllData();
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Помилка створення замовлення');
    } finally {
      setLoading(false);
    }
  };

  const openOrderDialog = (order) => {
    setViewingOrder(order);
    setShowOrderDialog(true);
  };

  const closeOrderDialog = () => {
    setShowOrderDialog(false);
    setViewingOrder(null);
    setEditingOrder(false);
  };

  const startEditingOrder = () => {
    if (!viewingOrder) return;
    
    // Populate edit form with current order data
    setEditOrderForm({
      date: viewingOrder.date ? viewingOrder.date.split('T')[0] : '',
      counterparty_edrpou: viewingOrder.counterparty_edrpou,
      counterparty_name: viewingOrder.counterparty_name,
      items: viewingOrder.items.map(item => ({ ...item })),
      total_amount: viewingOrder.total_amount
    });
    setEditingOrder(true);
  };

  const cancelEditingOrder = () => {
    setEditingOrder(false);
    setEditOrderForm({
      date: '',
      counterparty_edrpou: '',
      counterparty_name: '',
      items: [],
      total_amount: 0
    });
  };

  const saveEditedOrder = async () => {
    if (!viewingOrder) return;
    
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/orders/${viewingOrder._id}`,
        {
          date: editOrderForm.date,
          counterparty_edrpou: editOrderForm.counterparty_edrpou,
          counterparty_name: editOrderForm.counterparty_name,
          items: editOrderForm.items,
          total_amount: editOrderForm.total_amount
        }
      );
      
      toast.success('Замовлення успішно оновлено!');
      setEditingOrder(false);
      setViewingOrder(response.data);
      
      // Reload orders list
      await loadAllData();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(error.response?.data?.detail || 'Помилка оновлення замовлення');
    } finally {
      setLoading(false);
    }
  };

  const updateEditOrderItem = (index, field, value) => {
    const updatedItems = [...editOrderForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate amount for this item
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].amount = quantity * price;
    }
    
    // Recalculate total
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditOrderForm({
      ...editOrderForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const addEditOrderItem = () => {
    setEditOrderForm({
      ...editOrderForm,
      items: [...editOrderForm.items, { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]
    });
  };

  const removeEditOrderItem = (index) => {
    const updatedItems = editOrderForm.items.filter((_, i) => i !== index);
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditOrderForm({
      ...editOrderForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const deleteOrder = async () => {
    if (!viewingOrder) return;
    
    if (!window.confirm(`Ви впевнені, що хочете видалити замовлення №${viewingOrder.number}?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.delete(`${API_URL}/api/orders/${viewingOrder._id}`);
      toast.success('Замовлення успішно видалено!');
      
      await loadAllData();
      closeOrderDialog();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення замовлення');
    } finally {
      setLoading(false);
    }
  };

  const downloadOrderPDF = async () => {
    if (!viewingOrder) return;
    
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/orders/${viewingOrder._id}/pdf?t=${timestamp}`,
        { 
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Замовлення_${viewingOrder.number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF замовлення завантажено!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Помилка завантаження PDF');
    }
  };

  const previewOrderPDF = async () => {
    if (!viewingOrder) return;
    
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/orders/${viewingOrder._id}/pdf?t=${timestamp}`,
        { 
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      toast.success('PDF відкрито для перегляду');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Помилка відкриття PDF');
    }
  };

  // ==================== INVOICE FUNCTIONS ====================
  const openInvoiceDialog = (invoice) => {
    setViewingInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const closeInvoiceDialog = () => {
    setShowInvoiceDialog(false);
    setViewingInvoice(null);
    setEditingInvoice(false);
  };

  const deleteInvoice = async () => {
    if (!viewingInvoice) return;
    if (!window.confirm(`Ви впевнені, що хочете видалити рахунок №${viewingInvoice.number}?`)) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/invoices/${viewingInvoice.number}`);
      toast.success('Рахунок успішно видалено!');
      await loadAllData();
      closeInvoiceDialog();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення рахунку');
    } finally {
      setLoading(false);
    }
  };

  const startEditingInvoice = () => {
    if (!viewingInvoice) return;
    
    // Prepare edit form with current invoice data
    const dateStr = viewingInvoice.date ? 
      (viewingInvoice.date.split('T')[0]) : 
      new Date().toISOString().split('T')[0];
    
    setEditInvoiceForm({
      date: dateStr,
      items: viewingInvoice.items.map(item => ({...item})),
      total_amount: viewingInvoice.total_amount
    });
    setEditingInvoice(true);
  };

  const cancelEditingInvoice = () => {
    setEditingInvoice(false);
    setEditInvoiceForm({
      date: '',
      items: [],
      total_amount: 0
    });
  };

  const updateInvoiceItem = (index, field, value) => {
    const updatedItems = [...editInvoiceForm.items];
    updatedItems[index][field] = value;
    
    // Calculate amount if quantity or price changed
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].amount = quantity * price;
    }
    
    // Calculate total
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditInvoiceForm({
      ...editInvoiceForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const addInvoiceItem = () => {
    setEditInvoiceForm({
      ...editInvoiceForm,
      items: [...editInvoiceForm.items, { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]
    });
  };

  const removeInvoiceItem = (index) => {
    const updatedItems = editInvoiceForm.items.filter((_, i) => i !== index);
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditInvoiceForm({
      ...editInvoiceForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const saveEditedInvoice = async () => {
    if (!viewingInvoice) return;
    
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/invoices/${viewingInvoice.number}`, {
        date: editInvoiceForm.date,
        items: editInvoiceForm.items,
        total_amount: editInvoiceForm.total_amount
      });
      
      toast.success('Рахунок успішно оновлено!');
      setEditingInvoice(false);
      await loadAllData();
      
      // Update viewing invoice with new data
      const updatedInvoice = {
        ...viewingInvoice,
        date: editInvoiceForm.date,
        items: editInvoiceForm.items,
        total_amount: editInvoiceForm.total_amount
      };
      setViewingInvoice(updatedInvoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error(error.response?.data?.detail || 'Помилка оновлення рахунку');
    } finally {
      setLoading(false);
    }
  };

  // Filter functions for search
  const filterInvoicesByEdrpou = (invoices) => {
    if (!searchEdrpouInvoices) return invoices;
    return invoices.filter(inv => 
      inv.counterparty_edrpou.includes(searchEdrpouInvoices)
    );
  };

  const filterActsByEdrpou = (acts) => {
    if (!searchEdrpouActs) return acts;
    return acts.filter(act => 
      act.counterparty_edrpou.includes(searchEdrpouActs)
    );
  };

  const filterWaybillsByEdrpou = (waybills) => {
    if (!searchEdrpouWaybills) return waybills;
    return waybills.filter(wb => 
      wb.counterparty_edrpou.includes(searchEdrpouWaybills)
    );
  };

  const filterContractsByEdrpou = (contracts) => {
    if (!searchEdrpouContracts) return contracts;
    return contracts.filter(contract => 
      contract.counterparty_edrpou.includes(searchEdrpouContracts)
    );
  };

  const previewInvoicePDF = async () => {
    if (!viewingInvoice) return;
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/invoices/pdf/${viewingInvoice.number}?t=${timestamp}`,
        { responseType: 'blob', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      toast.success('PDF відкрито для перегляду');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Помилка відкриття PDF');
    }
  };

  const sendInvoiceEmail = async () => {
    if (!viewingInvoice || !emailRecipient) {
      toast.error('Вкажіть email для відправки');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/invoices/${viewingInvoice.number}/send-email`,
        { email: emailRecipient }
      );
      toast.success(`PDF відправлено на ${emailRecipient}`);
      setShowEmailDialog(false);
      setEmailRecipient('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ACT FUNCTIONS ====================
  const openActDialog = (act) => {
    setViewingAct(act);
    setShowActDialog(true);
  };

  const closeActDialog = () => {
    setShowActDialog(false);
    setViewingAct(null);
    setEditingAct(false);
  };

  const openContractDialog = (contract) => {
    setViewingContract(contract);
    setShowContractDialog(true);
  };

  const closeContractDialog = () => {
    setShowContractDialog(false);
    setViewingContract(null);
    setEditingContract(false);
  };

  const deleteContract = async () => {
    if (!viewingContract) return;
    if (!window.confirm(`Ви впевнені, що хочете видалити договір №${viewingContract.number}?`)) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/contracts/${viewingContract.number}`);
      toast.success('Договір успішно видалено!');
      closeContractDialog();
      await loadAllData();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення договору');
    } finally {
      setLoading(false);
    }
  };

  const viewContractPDF = async () => {
    if (!viewingContract) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/contracts/${viewingContract._id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing contract PDF:', error);
      toast.error('Помилка при перегляді PDF');
    }
  };

  const sendContractEmail = async () => {
    if (!viewingContract) return;
    
    const email = prompt('Введіть email отримувача:');
    if (!email) return;
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/contracts/${viewingContract._id}/email`, {
        recipient_email: email
      });
      toast.success('Email успішно надіслано!');
    } catch (error) {
      console.error('Error sending contract email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  const deleteAct = async () => {
    if (!viewingAct) return;
    if (!window.confirm(`Ви впевнені, що хочете видалити акт №${viewingAct.number}?`)) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/acts/${viewingAct.number}`);
      toast.success('Акт успішно видалено!');
      await loadAllData();
      closeActDialog();
    } catch (error) {
      console.error('Error deleting act:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення акту');
    } finally {
      setLoading(false);
    }
  };

  const downloadActPDF = async () => {
    if (!viewingAct) return;
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/acts/pdf/${viewingAct.number}?t=${timestamp}`,
        { responseType: 'blob', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Акт_${viewingAct.number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF акту завантажено!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Помилка завантаження PDF');
    }
  };

  const previewActPDF = async () => {
    if (!viewingAct) return;
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/acts/pdf/${viewingAct.number}?t=${timestamp}`,
        { responseType: 'blob', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      toast.success('PDF відкрито для перегляду');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Помилка відкриття PDF');
    }
  };

  const sendActEmail = async () => {
    if (!viewingAct || !emailRecipient) {
      toast.error('Вкажіть email для відправки');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/acts/${viewingAct.number}/send-email`,
        { email: emailRecipient }
      );
      toast.success(`PDF відправлено на ${emailRecipient}`);
      setShowEmailDialog(false);
      setEmailRecipient('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  // ==================== WAYBILL FUNCTIONS ====================
  const openWaybillDialog = (waybill) => {
    setViewingWaybill(waybill);
    setShowWaybillDialog(true);
  };

  const closeWaybillDialog = () => {
    setShowWaybillDialog(false);
    setViewingWaybill(null);
    setEditingWaybill(false);
  };

  const deleteWaybill = async () => {
    if (!viewingWaybill) return;
    if (!window.confirm(`Ви впевнені, що хочете видалити накладну №${viewingWaybill.number}?`)) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/waybills/${viewingWaybill.number}`);
      toast.success('Накладну успішно видалено!');
      await loadAllData();
      closeWaybillDialog();
    } catch (error) {
      console.error('Error deleting waybill:', error);
      toast.error(error.response?.data?.detail || 'Помилка видалення накладної');
    } finally {
      setLoading(false);
    }
  };

  const downloadWaybillPDF = async () => {
    if (!viewingWaybill) return;
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/waybills/pdf/${viewingWaybill.number}?t=${timestamp}`,
        { responseType: 'blob', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Накладна_${viewingWaybill.number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF накладної завантажено!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Помилка завантаження PDF');
    }
  };

  const previewWaybillPDF = async () => {
    if (!viewingWaybill) return;
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/api/waybills/pdf/${viewingWaybill.number}?t=${timestamp}`,
        { responseType: 'blob', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      toast.success('PDF відкрито для перегляду');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Помилка відкриття PDF');
    }
  };

  const sendWaybillEmail = async () => {
    if (!viewingWaybill || !emailRecipient) {
      toast.error('Вкажіть email для відправки');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/waybills/${viewingWaybill.number}/send-email`,
        { email: emailRecipient }
      );
      toast.success(`PDF відправлено на ${emailRecipient}`);
      setShowEmailDialog(false);
      setEmailRecipient('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.detail || 'Помилка відправки email');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill signature from director name
  // Format: Ім'я ПРІЗВИЩЕ (e.g., "Станіслав ЧОРНИЙ")
  const generateSignature = (fullName) => {
    if (!fullName || !fullName.trim()) return '';
    
    const parts = fullName.trim().split(' ').filter(p => p);
    if (parts.length === 0) return '';
    
    // Format: Ім'я ПРІЗВИЩЕ
    // parts[0] = Прізвище, parts[1] = Ім'я, parts[2] = По батькові
    if (parts.length >= 2) {
      const surname = parts[0].toUpperCase();
      const firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
      return `${firstName} ${surname}`;
    }
    
    return parts[0].toUpperCase();
  };

  // Auto-extract MFO from IBAN
  // Format: UA59 305299 0000026008034909558
  // MFO is 6 digits after first 4 characters (UA59)
  const extractMFOFromIBAN = (iban) => {
    if (!iban || iban.length < 10) return '';
    
    // Remove spaces and get characters 5-10 (index 4-9)
    const cleanIban = iban.replace(/\s/g, '');
    if (cleanIban.length >= 10) {
      return cleanIban.substring(4, 10);
    }
    
    return '';
  };

  // Generate "В особі" text
  // Format: "посади_родовий ПІБ_родовий, що діє на підставі ..."
  const generateRepresentedBy = (position, fullName, basis) => {
    if (!position || !fullName || !basis) return '';
    
    // Convert position to genitive case (родовий відмінок)
    const positionGenitive = convertPositionToGenitive(position);
    
    // Convert name to genitive case
    const nameGenitive = convertNameToGenitive(fullName);
    
    // Basis text - handle both Ukrainian and English values
    let basisText = '';
    if (basis === 'Статуту' || basis === 'statute') {
      basisText = 'Статуту';
    } else if (basis === 'Довіреності' || basis === 'power_of_attorney') {
      basisText = 'Довіреності';
    } else if (basis === 'Виписка' || basis === 'Положення' || basis === 'edr') {
      basisText = 'Виписки з ЄДР';
    } else {
      // Default: use the basis value as-is if it's already in correct form
      basisText = basis;
    }
    
    return `${positionGenitive} ${nameGenitive}, що діє на підставі ${basisText}`;
  };

  // Helper: Convert position to genitive case
  const convertPositionToGenitive = (position) => {
    const pos = position.toLowerCase().trim();
    
    // Common positions in genitive case
    const genitiveMap = {
      'директор': 'директора',
      'генеральний директор': 'генерального директора',
      'керівник': 'керівника',
      'президент': 'президента',
      'голова': 'голови',
      'заступник': 'заступника',
      'менеджер': 'менеджера'
    };
    
    return genitiveMap[pos] || position.toLowerCase();
  };

  // Helper: Convert full name to genitive case
  const convertNameToGenitive = (fullName) => {
    const parts = fullName.trim().split(' ').filter(p => p);
    if (parts.length === 0) return fullName;
    
    // Basic genitive conversion (can be improved)
    // Format: Прізвище Ім'я По-батькові -> Прізвище_родовий Ім'я_родовий По-батькові_родовий
    
    const convertWord = (word) => {
      // Basic Ukrainian genitive rules
      if (word.endsWith('ий') || word.endsWith('ій')) {
        return word.slice(0, -2) + 'ого';
      }
      if (word.endsWith('а')) {
        return word.slice(0, -1) + 'и';
      }
      if (word.endsWith('о')) {
        return word.slice(0, -1) + 'а';
      }
      // Default: add 'а' for masculine names
      return word + 'а';
    };
    
    return parts.map(convertWord).join(' ');
  };

  // Search company info by EDRPOU using AI
  const searchByEdrpou = async (edrpou) => {
    if (!edrpou || (edrpou.length !== 8 && edrpou.length !== 10)) {
      toast.error('Введіть коректний ЄДРПОУ (8 цифр для ЮрОсіб або 10 цифр для ФОП)');
      return;
    }

    setSearchingEdrpou(true);
    
    try {
      // Using web search to find company information
      const searchQuery = `ЄДРПОУ ${edrpou} Україна повна назва юридична адреса`;
      
      // Call backend to perform web search (we'll create this endpoint)
      const response = await axios.post(`${API_URL}/api/search-company`, {
        edrpou: edrpou
      });

      if (response.data.found) {
        // Add "ФІЗИЧНА ОСОБА-ПІДПРИЄМЕЦЬ" prefix for 10-digit EDRPOU (FOP)
        let fullName = response.data.name || counterpartyForm.representative_name;
        if (edrpou.length === 10 && fullName && !fullName.startsWith('ФІЗИЧНА ОСОБА-ПІДПРИЄМЕЦЬ')) {
          fullName = 'ФІЗИЧНА ОСОБА-ПІДПРИЄМЕЦЬ ' + fullName;
        }
        
        setCounterpartyForm(prev => ({
          ...prev,
          representative_name: fullName,
          legal_address: response.data.legal_address || prev.legal_address
        }));
        
        toast.success('Дані знайдено! Перевірте та відредагуйте при необхідності');
      } else {
        toast.info('Дані не знайдено. Введіть вручну');
      }
    } catch (error) {
      console.error('Error searching company:', error);
      toast.error('Помилка пошуку. Введіть дані вручну');
    } finally {
      setSearchingEdrpou(false);
    }
  };

  // Handle EDRPOU input change with auto-search
  const handleEdrpouChange = (value) => {
    // Only allow digits
    const digitOnly = value.replace(/\D/g, '');
    setCounterpartyForm(prev => ({...prev, edrpou: digitOnly}));
    
    // Auto-search when 8 digits (ЮрОсоба) or 10 digits (ФОП) entered
    if ((digitOnly.length === 8 || digitOnly.length === 10)) {
      searchByEdrpou(digitOnly);
    }
  };

  // Handle director name change with auto-fill signature and represented_by
  const handleDirectorNameChange = (value) => {
    setCounterpartyForm(prev => {
      const newSignature = generateSignature(value);
      const newRepresentedBy = generateRepresentedBy(prev.position, value, prev.contract_type);
      
      return {
        ...prev,
        director_name: value,
        signature: newSignature,
        represented_by: newRepresentedBy
      };
    });
  };

  // Handle position change with auto-update represented_by
  const handlePositionChange = (value) => {
    setCounterpartyForm(prev => {
      const newRepresentedBy = generateRepresentedBy(value, prev.director_name, prev.contract_type);
      
      return {
        ...prev,
        position: value,
        represented_by: newRepresentedBy
      };
    });
  };

  // Handle basis change with auto-update represented_by
  const handleBasisChange = (value) => {
    setCounterpartyForm(prev => {
      const newRepresentedBy = generateRepresentedBy(prev.position, prev.director_name, value);
      
      return {
        ...prev,
        contract_type: value,
        represented_by: newRepresentedBy
      };
    });
  };

  // Handle IBAN change with auto-extract MFO
  const handleIBANChange = (value) => {
    const mfo = extractMFOFromIBAN(value);
    
    setCounterpartyForm(prev => ({
      ...prev,
      iban: value,
      mfo: mfo
    }));
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
  // Function to populate form from selected order
  const handleOrderSelection = (orderNumber) => {
    if (!orderNumber || orderNumber === 'none') {
      // Clear form if no order selected
      setDocumentForm({
        counterparty_edrpou: '',
        items: [{ name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }],
        total_amount: 0,
        based_on_order: ''
      });
      setFoundCounterparty(null);
      return;
    }
    
    const order = orders.find(o => o.number === orderNumber);
    if (!order) return;
    
    // Find counterparty
    const counterparty = counterparties.find(c => c.edrpou === order.counterparty_edrpou);
    
    // Set form data
    setDocumentForm({
      counterparty_edrpou: order.counterparty_edrpou,
      items: order.items.map(item => ({...item})),
      total_amount: order.total_amount,
      based_on_order: orderNumber
    });
    
    setFoundCounterparty(counterparty);
    toast.success(`Дані з замовлення №${orderNumber} завантажено`);
  };

  const createDocument = async (endpoint, docType) => {
    if (!foundCounterparty) {
      toast.error('Спочатку знайдіть контрагента або оберіть замовлення');
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

  // Function to populate contract form from selected order
  const handleOrderSelectionForContract = (orderNumber) => {
    if (!orderNumber || orderNumber === 'none') {
      setContractForm({
        counterparty_edrpou: '',
        contract_type: '',
        subject: '',
        amount: 0,
        based_on_order: ''
      });
      setFoundCounterparty(null);
      return;
    }
    
    const order = orders.find(o => o.number === orderNumber);
    if (!order) return;
    
    const counterparty = counterparties.find(c => c.edrpou === order.counterparty_edrpou);
    
    setContractForm({
      counterparty_edrpou: order.counterparty_edrpou,
      contract_type: '',
      subject: `Договір на основі замовлення ${orderNumber}`,
      amount: order.total_amount,
      based_on_order: orderNumber
    });
    
    setFoundCounterparty(counterparty);
    toast.success(`Дані з замовлення №${orderNumber} завантажено`);
  };

  // Create contract
  const createContract = async () => {
    if (!foundCounterparty) {
      toast.error('Спочатку знайдіть контрагента або оберіть замовлення');
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

  // Profile functions
  const loadUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setProfileData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        company_name: response.data.company_name || '',
        phone: response.data.phone || '',
        edrpou: response.data.edrpou || '',
        representative_name: response.data.representative_name || '',
        legal_address: response.data.legal_address || '',
        iban: response.data.iban || '',
        bank: response.data.bank || '',
        mfo: response.data.mfo || '',
        director_name: response.data.director_name || '',
        director_position: response.data.director_position || '',
        position: response.data.position || '',
        represented_by: response.data.represented_by || '',
        signature: response.data.signature || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Помилка завантаження профілю');
    }
  };

  const fetchYouScoreDataForProfile = async () => {
    if (!profileData.edrpou || profileData.edrpou.length < 8) {
      toast.error('Введіть коректний ЄДРПОУ (8 або 10 цифр)');
      return;
    }

    setLoadingProfile(true);
    try {
      const response = await axios.get(`${API_URL}/api/counterparties/youscore/${profileData.edrpou}`);
      
      if (response.data) {
        const data = response.data;
        
        // Handle 10-digit EDRPOU (FOP)
        let representativeName = data.name || '';
        if (profileData.edrpou.length === 10) {
          representativeName = `ФІЗИЧНА ОСОБА-ПІДПРИЄМЕЦЬ ${representativeName}`;
        }
        
        setProfileData(prev => ({
          ...prev,
          representative_name: representativeName,
          legal_address: data.address || '',
          director_name: data.ceo || '',
          director_position: data.ceo ? 'Директор' : ''
        }));
        
        toast.success('Дані успішно отримані!');
      }
    } catch (error) {
      console.error('Error fetching YouScore data:', error);
      toast.error(error.response?.data?.detail || 'Помилка отримання даних з YouScore');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Profile-specific handlers (same logic as counterparty form)
  const handleProfileEdrpouChange = (value) => {
    const filtered = value.replace(/\D/g, '');
    if (filtered.length <= 10) {
      setProfileData({...profileData, edrpou: filtered});
      
      // Auto-search when 8 or 10 digits
      if (filtered.length === 8 || filtered.length === 10) {
        searchByEdrpouProfile(filtered);
      }
    }
  };

  const searchByEdrpouProfile = async (edrpou) => {
    setSearchingEdrpouProfile(true);
    try {
      const response = await axios.get(`${API_URL}/api/counterparties/youscore/${edrpou}`);
      if (response.data) {
        const data = response.data;
        let representativeName = data.name || '';
        if (edrpou.length === 10) {
          representativeName = `ФІЗИЧНА ОСОБА-ПІДПРИЄМЕЦЬ ${representativeName}`;
        }
        
        setProfileData(prev => ({
          ...prev,
          representative_name: representativeName,
          legal_address: data.address || '',
          director_name: data.ceo || '',
          position: data.ceo ? 'Директор' : prev.position
        }));
        
        // Auto-generate signature if director name was filled
        if (data.ceo) {
          const sig = generateSignature(data.ceo);
          setProfileData(prev => ({...prev, signature: sig}));
        }
        
        toast.success('Дані отримано з YouScore');
      }
    } catch (error) {
      console.error('Error fetching YouScore:', error);
    } finally {
      setSearchingEdrpouProfile(false);
    }
  };

  const handleProfileIBANChange = (value) => {
    const upper = value.toUpperCase();
    setProfileData({...profileData, iban: upper});
    
    if (upper.length >= 10) {
      const mfo = upper.substring(4, 10);
      setProfileData(prev => ({...prev, iban: upper, mfo: mfo}));
    }
  };

  const handleProfileDirectorNameChange = (value) => {
    setProfileData(prev => {
      const sig = value ? generateSignature(value) : '';
      const represented = generateRepresentedBy(prev.position, value, prev.contract_type);
      
      return {
        ...prev,
        director_name: value,
        signature: sig,
        represented_by: represented
      };
    });
  };

  const handleProfilePositionChange = (value) => {
    setProfileData(prev => {
      const represented = generateRepresentedBy(value, prev.director_name, prev.contract_type);
      
      return {
        ...prev,
        position: value,
        represented_by: represented
      };
    });
  };

  const handleProfileBasisChange = (value) => {
    setProfileData(prev => {
      const represented = generateRepresentedBy(prev.position, prev.director_name, value);
      
      return {
        ...prev,
        contract_type: value,
        represented_by: represented
      };
    });
  };

  const saveUserProfile = async () => {
    // Auto-generate represented_by from director info
    const representedBy = generateRepresentedBy(
      profileData.director_name,
      profileData.director_position
    );
    
    const dataToSave = {
      ...profileData,
      represented_by: representedBy
    };
    
    setLoadingProfile(true);
    try {
      await axios.put(`${API_URL}/api/auth/profile`, dataToSave);
      toast.success('Профіль успішно оновлено!');
      await loadUserProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження профілю');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Update represented_by when director data changes (for profile)
  useEffect(() => {
    if (profileData.director_name && profileData.director_position) {
      const representedBy = generateRepresentedBy(
        profileData.director_name,
        profileData.director_position
      );
      setProfileData(prev => ({...prev, represented_by: representedBy}));
    }
  }, [profileData.director_name, profileData.director_position]);

  return (
    <div className="min-h-screen">
      {/* Header with Modern Gradient */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl border-b border-purple-500/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3 slide-up">
              <div className="relative">
                <FileText className="w-10 h-10 text-purple-400 drop-shadow-lg" />
                <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                  Система Управління Документами
                </h1>
                <p className="text-xs text-purple-300/70">Професійний документообіг</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/templates')}
                className="btn-scale border-purple-400/30 hover:border-purple-400 hover:bg-purple-500/10 text-purple-100 hover:text-white transition-all duration-300"
              >
                <Code className="w-4 h-4 mr-2" />
                Шаблони
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowProfileDialog(true)}
                className="btn-scale border-pink-400/30 hover:border-pink-400 hover:bg-pink-500/10 text-pink-100 hover:text-white transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Профіль
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="btn-scale border-red-400/30 hover:border-red-400 hover:bg-red-500/10 text-red-100 hover:text-white transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Вийти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Dynamic Background */}
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient} transition-all duration-500`}>
        <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="counterparties" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded-xl shadow-lg gap-2">
            <TabsTrigger 
              value="counterparties"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Контрагенти
            </TabsTrigger>
            <TabsTrigger 
              value="orders"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
              <FileText className="w-4 h-4 mr-2" />
              Замовлення
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Рахунки
            </TabsTrigger>
            <TabsTrigger 
              value="acts"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Акти
            </TabsTrigger>
            <TabsTrigger 
              value="waybills"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
              <Package className="w-4 h-4 mr-2" />
              Накладні
            </TabsTrigger>
            <TabsTrigger 
              value="contracts"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105 transition-all duration-300 rounded-lg"
            >
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
                      <Label htmlFor="edrpou">
                        ЄДРПОУ * 
                        {searchingEdrpou && (
                          <span className="text-xs text-teal-600 ml-2">
                            (пошук даних...)
                          </span>
                        )}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="edrpou"
                          type="text"
                          inputMode="numeric"
                          value={counterpartyForm.edrpou}
                          onChange={(e) => handleEdrpouChange(e.target.value)}
                          placeholder="12345678 або 1234567890"
                          maxLength={10}
                          required
                          disabled={searchingEdrpou}
                        />
                        {(counterpartyForm.edrpou.length === 8 || counterpartyForm.edrpou.length === 10) && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => searchByEdrpou(counterpartyForm.edrpou)}
                            disabled={searchingEdrpou}
                          >
                            {searchingEdrpou ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Дані підтягуються автоматично при введенні 8 цифр (ЮрОсоба) або 10 цифр (ФОП)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="representative_name">
                        Назва * 
                        {searchingEdrpou && (
                          <span className="text-xs text-teal-600 ml-2">
                            (оновлюється...)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="representative_name"
                        value={counterpartyForm.representative_name}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, representative_name: e.target.value})}
                        placeholder="Автоматично заповниться або введіть вручну"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="legal_address">
                        Юридична адреса
                        {searchingEdrpou && (
                          <span className="text-xs text-teal-600 ml-2">
                            (оновлюється...)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="legal_address"
                        value={counterpartyForm.legal_address}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, legal_address: e.target.value})}
                        placeholder="Автоматично заповниться за ЄДРПОУ або введіть вручну"
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
                      <Label htmlFor="iban">
                        IBAN *
                        <span className="text-xs text-gray-500 ml-2">
                          (МФО формується автоматично)
                        </span>
                      </Label>
                      <Input
                        id="iban"
                        value={counterpartyForm.iban}
                        onChange={(e) => handleIBANChange(e.target.value)}
                        placeholder="UA593052990000026008034909558"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        МФО: 6 цифр після перших 4 символів
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="bank">Назва банку</Label>
                      <Input
                        id="bank"
                        value={counterpartyForm.bank}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, bank: e.target.value})}
                        placeholder="АТ КБ 'ПриватБанк'"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mfo">
                        МФО банку
                        <span className="text-xs text-teal-600 ml-2">
                          (автоматично з IBAN)
                        </span>
                      </Label>
                      <Input
                        id="mfo"
                        value={counterpartyForm.mfo}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, mfo: e.target.value})}
                        placeholder="305299"
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="director_name">ПІБ керівника</Label>
                      <Input
                        id="director_name"
                        value={counterpartyForm.director_name}
                        onChange={(e) => handleDirectorNameChange(e.target.value)}
                        placeholder="Чорний Станіслав Іванович"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Формат: Прізвище Ім'я По-батькові
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="position">Посада</Label>
                      <Input
                        id="position"
                        value={counterpartyForm.position}
                        onChange={(e) => handlePositionChange(e.target.value)}
                        placeholder="Директор"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Для автозаповнення "В особі"
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="basis">Діє на підставі</Label>
                      <Select 
                        value={counterpartyForm.contract_type} 
                        onValueChange={handleBasisChange}
                      >
                        <SelectTrigger id="basis">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Статуту">Статуту</SelectItem>
                          <SelectItem value="Довіреності">Довіреності</SelectItem>
                          <SelectItem value="Виписка">Виписки з ЄДР</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="represented_by">
                        В особі
                        <span className="text-xs text-teal-600 ml-2">
                          (формується автоматично)
                        </span>
                      </Label>
                      <Input
                        id="represented_by"
                        value={counterpartyForm.represented_by}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, represented_by: e.target.value})}
                        placeholder="директора Чорного Станіслава Івановича, що діє на підставі Статуту"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Автоматично: посада (родовий) + ПІБ (родовий) + підстава
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="signature">
                        Підпис
                        <span className="text-xs text-teal-600 ml-2">
                          (автоматично з ПІБ)
                        </span>
                      </Label>
                      <Input
                        id="signature"
                        value={counterpartyForm.signature}
                        onChange={(e) => setCounterpartyForm({...counterpartyForm, signature: e.target.value})}
                        placeholder="Станіслав ЧОРНИЙ"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Формат: Ім'я ПРІЗВИЩЕ
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className={`w-full ${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                  >
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
                      <Card 
                        key={counterparty._id} 
                        className={`card-hover cursor-pointer ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} ${currentTheme.shadow} transition-all duration-300`}
                        onClick={() => viewCounterpartyDetails(counterparty)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`font-semibold text-lg ${currentTheme.text}`}>{counterparty.representative_name}</p>
                              <p className={`text-sm ${currentTheme.textLight}`}>ЄДРПОУ: {counterparty.edrpou}</p>
                              <p className="text-sm text-gray-600">
                                {counterparty.email} | {counterparty.phone}
                              </p>
                            </div>
                            <Eye className={`w-5 h-5 ${currentTheme.textLight}`} />
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
                  {/* Order Selection */}
                  <div className="space-y-2">
                    <Label>Створити на основі замовлення (опціонально)</Label>
                    <Select 
                      value={documentForm.based_on_order} 
                      onValueChange={handleOrderSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть замовлення або створіть нове" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без замовлення (новий документ)</SelectItem>
                        {orders.map(order => (
                          <SelectItem key={order._id} value={order.number}>
                            №{order.number} | {order.counterparty_name} | {order.total_amount} грн
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Пошук контрагента</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="ЄДРПОУ"
                        disabled={!!documentForm.based_on_order && documentForm.based_on_order !== 'none'}
                      />
                      <Button type="button" onClick={searchCounterparty} disabled={!!documentForm.based_on_order}>
                        <Search className="w-4 h-4 mr-2" />
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className={`p-3 ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} rounded-lg`}>
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

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty} 
                    className={`w-full ${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      <>Створити Рахунок</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <InvoiceList
              invoices={invoices}
              searchValue={searchEdrpouInvoices}
              onSearchChange={setSearchEdrpouInvoices}
              onViewInvoice={openInvoiceDialog}
              onEditInvoice={startEditingInvoice}
              theme={currentTheme}
              filterByEdrpou={filterInvoicesByEdrpou}
            />
          </TabsContent>

          {/* Acts, Waybills, Orders, Contracts tabs similar structure */}
          <TabsContent value="acts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Створити Акт</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); createDocument('acts', 'Акт'); }} className="space-y-4">
                  {/* Order Selection */}
                  <div className="space-y-2">
                    <Label>Створити на основі замовлення (опціонально)</Label>
                    <Select 
                      value={documentForm.based_on_order} 
                      onValueChange={handleOrderSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть замовлення або створіть новий" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без замовлення (новий документ)</SelectItem>
                        {orders.map(order => (
                          <SelectItem key={order._id} value={order.number}>
                            №{order.number} | {order.counterparty_name} | {order.total_amount} грн
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Пошук контрагента</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="ЄДРПОУ"
                        disabled={!!documentForm.based_on_order && documentForm.based_on_order !== 'none'}
                      />
                      <Button type="button" onClick={searchCounterparty} disabled={!!documentForm.based_on_order}>
                        <Search className="w-4 h-4 mr-2" />
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className={`p-3 ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} rounded-lg`}>
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

                  <div className="p-4 bg-purple-50 border rounded">
                    <div className="flex justify-between">
                      <span className="font-semibold">Загальна сума:</span>
                      <span className="text-xl font-bold text-purple-700">
                        {documentForm.total_amount.toFixed(2)} грн
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty} 
                    className={`w-full ${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      <>Створити Акт</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список Актів ({filterActsByEdrpou(acts).length})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search by EDRPOU */}
                <div className="mb-4">
                  <Label className="text-sm text-gray-600">Пошук за ЄДРПОУ</Label>
                  <Input
                    value={searchEdrpouActs}
                    onChange={(e) => setSearchEdrpouActs(e.target.value)}
                    placeholder="Введіть ЄДРПОУ контрагента"
                    className="max-w-md"
                  />
                </div>

                {filterActsByEdrpou(acts).length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    {searchEdrpouActs ? 'Актів з таким ЄДРПОУ не знайдено' : 'Немає актів'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filterActsByEdrpou(acts).map((act) => (
                      <Card 
                        key={act._id} 
                        className={`card-hover ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} ${currentTheme.shadow} transition-all duration-300 group`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 cursor-pointer" onClick={() => openActDialog(act)}>
                              <p className={`font-medium ${currentTheme.text}`}>№{act.number}</p>
                              <p className="text-sm text-gray-600">{act.counterparty_name}</p>
                              <p className={`font-bold ${currentTheme.text}`}>{act.total_amount} грн</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openActDialog(act);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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

          <TabsContent value="waybills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Створити Накладну</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); createDocument('waybills', 'Накладну'); }} className="space-y-4">
                  {/* Order Selection */}
                  <div className="space-y-2">
                    <Label>Створити на основі замовлення (опціонально)</Label>
                    <Select 
                      value={documentForm.based_on_order} 
                      onValueChange={handleOrderSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть замовлення або створіть нову" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без замовлення (новий документ)</SelectItem>
                        {orders.map(order => (
                          <SelectItem key={order._id} value={order.number}>
                            №{order.number} | {order.counterparty_name} | {order.total_amount} грн
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Пошук контрагента</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="ЄДРПОУ"
                        disabled={!!documentForm.based_on_order && documentForm.based_on_order !== 'none'}
                      />
                      <Button type="button" onClick={searchCounterparty} disabled={!!documentForm.based_on_order}>
                        <Search className="w-4 h-4 mr-2" />
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className={`p-3 ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} rounded-lg`}>
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

                  <div className="p-4 bg-orange-50 border rounded">
                    <div className="flex justify-between">
                      <span className="font-semibold">Загальна сума:</span>
                      <span className="text-xl font-bold text-orange-700">
                        {documentForm.total_amount.toFixed(2)} грн
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty} 
                    className={`w-full ${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      <>Створити Накладну</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список Накладних ({filterWaybillsByEdrpou(waybills).length})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search by EDRPOU */}
                <div className="mb-4">
                  <Label className="text-sm text-gray-600">Пошук за ЄДРПОУ</Label>
                  <Input
                    value={searchEdrpouWaybills}
                    onChange={(e) => setSearchEdrpouWaybills(e.target.value)}
                    placeholder="Введіть ЄДРПОУ контрагента"
                    className="max-w-md"
                  />
                </div>

                {filterWaybillsByEdrpou(waybills).length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    {searchEdrpouWaybills ? 'Накладних з таким ЄДРПОУ не знайдено' : 'Немає накладних'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filterWaybillsByEdrpou(waybills).map((waybill) => (
                      <Card 
                        key={waybill._id} 
                        className={`card-hover ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} ${currentTheme.shadow} transition-all duration-300 group`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 cursor-pointer" onClick={() => openWaybillDialog(waybill)}>
                              <p className={`font-medium ${currentTheme.text}`}>№{waybill.number}</p>
                              <p className="text-sm text-gray-600">{waybill.counterparty_name}</p>
                              <p className={`font-bold ${currentTheme.text}`}>{waybill.total_amount} грн</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWaybillDialog(waybill);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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

          <TabsContent value="orders" className="space-y-6">
            {/* Create Order Form */}
            <Card>
              <CardHeader>
                <CardTitle>Створити Замовлення</CardTitle>
                <CardDescription>
                  Номер замовлення: {orders.length > 0 ? String(Math.max(...orders.map(o => parseInt(o.number) || 0)) + 1).padStart(4, '0') : '0001'}
                  {selectedCounterpartyForOrder && ` • Контрагент: ${selectedCounterpartyForOrder.representative_name}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!selectedCounterpartyForOrder ? (
                    <>
                      {/* Step 1: Select or Search Counterparty */}
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="order_edrpou_search">Пошук за ЄДРПОУ</Label>
                          <div className="flex gap-2">
                            <Input
                              id="order_edrpou_search"
                              type="text"
                              inputMode="numeric"
                              placeholder="Введіть ЄДРПОУ (8 або 10 цифр)"
                              maxLength={10}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                e.target.value = value;
                                
                                // Auto-search when 8 or 10 digits entered
                                if (value.length === 8 || value.length === 10) {
                                  const cp = counterparties.find(c => c.edrpou === value);
                                  if (cp) {
                                    setSelectedCounterpartyForOrder(cp);
                                    toast.success(`Знайдено: ${cp.representative_name}`);
                                  } else {
                                    toast.error('Контрагента з таким ЄДРПОУ не знайдено');
                                  }
                                }
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Введіть 8 цифр (ЮрОсоба) або 10 цифр (ФОП)
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex-1 border-t border-gray-300"></div>
                          <span className="text-sm text-gray-500">або</span>
                          <div className="flex-1 border-t border-gray-300"></div>
                        </div>
                        
                        <div>
                          <Label htmlFor="order_counterparty">Оберіть зі списку</Label>
                          <Select 
                            onValueChange={(edrpou) => {
                              const cp = counterparties.find(c => c.edrpou === edrpou);
                              setSelectedCounterpartyForOrder(cp);
                            }}
                          >
                            <SelectTrigger id="order_counterparty">
                              <SelectValue placeholder="Оберіть контрагента зі списку" />
                            </SelectTrigger>
                            <SelectContent>
                              {counterparties
                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                .map((cp) => (
                                  <SelectItem key={cp._id} value={cp.edrpou}>
                                    {cp.representative_name} ({cp.edrpou})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Контрагенти відсортовані від нових до старих
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                        ℹ️ Номер замовлення буде присвоєно автоматично після вибору контрагента
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Step 2: Add Items */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label>Товари/Послуги</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setOrderItems([...orderItems, { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }])}
                          >
                            + Додати рядок
                          </Button>
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Назва</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Од.</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Кільк.</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ціна</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Сума</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.map((item, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-3 py-2">
                                    <Input
                                      value={item.name}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].name = e.target.value;
                                        setOrderItems(newItems);
                                      }}
                                      placeholder="Назва товару/послуги"
                                      className="h-8"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      value={item.unit}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].unit = e.target.value;
                                        setOrderItems(newItems);
                                      }}
                                      placeholder="шт"
                                      className="h-8 w-16"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].quantity = parseFloat(e.target.value) || 0;
                                        newItems[index].amount = newItems[index].quantity * newItems[index].price;
                                        setOrderItems(newItems);
                                      }}
                                      className="h-8 w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].price = parseFloat(e.target.value) || 0;
                                        newItems[index].amount = newItems[index].quantity * newItems[index].price;
                                        setOrderItems(newItems);
                                      }}
                                      className="h-8 w-24"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="font-medium">{item.amount.toFixed(2)}</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {orderItems.length > 1 && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const newItems = orderItems.filter((_, i) => i !== index);
                                          setOrderItems(newItems);
                                        }}
                                      >
                                        ✕
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan="4" className="px-3 py-2 text-right font-medium">
                                  Загальна сума:
                                </td>
                                <td className="px-3 py-2 font-bold">
                                  {orderItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)} грн
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedCounterpartyForOrder(null);
                            setOrderItems([{ name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]);
                          }}
                        >
                          Скасувати
                        </Button>
                        <Button
                          type="button"
                          disabled={orderItems.every(item => !item.name) || loading}
                          onClick={handleCreateOrder}
                          className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                        >
                          {loading ? 'Створення...' : 'Створити Замовлення'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Orders List */}
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
                      <Card 
                        key={order._id} 
                        className={`card-hover ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} ${currentTheme.shadow} transition-all duration-300`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 cursor-pointer" onClick={() => openOrderDialog(order)}>
                              <p className={`font-medium ${currentTheme.text}`}>№{order.number}</p>
                              <p className="text-sm text-gray-600">{order.counterparty_name}</p>
                              <p className={`font-bold ${currentTheme.text}`}>{order.total_amount} грн</p>
                              <p className="text-xs text-gray-500">{order.date}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openOrderDialog(order);
                                }}
                                className={`border-2 ${currentTheme.border} ${currentTheme.hover} ${currentTheme.textLight} hover:scale-105 transition-all duration-300`}
                              >
                                Переглянути
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setShowOrderSelectionDialog(true);
                                }}
                                className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white hover:scale-105 transition-all duration-300`}
                              >
                                Створити документи
                              </Button>
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

          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Створити Договір</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); createContract(); }} className="space-y-4">
                  {/* Order Selection */}
                  <div className="space-y-2">
                    <Label>Створити на основі замовлення (опціонально)</Label>
                    <Select 
                      value={contractForm.based_on_order} 
                      onValueChange={handleOrderSelectionForContract}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть замовлення або створіть новий" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без замовлення (новий документ)</SelectItem>
                        {orders.map(order => (
                          <SelectItem key={order._id} value={order.number}>
                            №{order.number} | {order.counterparty_name} | {order.total_amount} грн
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Пошук контрагента</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchEdrpou}
                        onChange={(e) => setSearchEdrpou(e.target.value)}
                        placeholder="ЄДРПОУ"
                        disabled={!!contractForm.based_on_order && contractForm.based_on_order !== 'none'}
                      />
                      <Button type="button" onClick={searchCounterparty} disabled={!!contractForm.based_on_order}>
                        <Search className="w-4 h-4 mr-2" />
                        Знайти
                      </Button>
                    </div>
                    {foundCounterparty && (
                      <div className={`p-3 ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} rounded-lg`}>
                        <p className="font-medium">{foundCounterparty.representative_name}</p>
                        <p className="text-sm text-gray-600">ЄДРПОУ: {foundCounterparty.edrpou}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Предмет договору</Label>
                    <Input
                      value={contractForm.subject}
                      onChange={(e) => setContractForm({...contractForm, subject: e.target.value})}
                      placeholder="Опис предмету договору"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Сума договору (грн)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={contractForm.amount}
                      onChange={(e) => setContractForm({...contractForm, amount: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="p-4 bg-rose-50 border rounded">
                    <div className="flex justify-between">
                      <span className="font-semibold">Загальна сума:</span>
                      <span className="text-xl font-bold text-rose-700">
                        {parseFloat(contractForm.amount || 0).toFixed(2)} грн
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !foundCounterparty} 
                    className={`w-full ${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Створення...</>
                    ) : (
                      <>Створити Договір</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список Договорів ({filterContractsByEdrpou(contracts).length})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search by EDRPOU */}
                <div className="mb-4">
                  <Label className="text-sm text-gray-600">Пошук за ЄДРПОУ</Label>
                  <Input
                    value={searchEdrpouContracts}
                    onChange={(e) => setSearchEdrpouContracts(e.target.value)}
                    placeholder="Введіть ЄДРПОУ контрагента"
                    className="max-w-md"
                  />
                </div>

                {filterContractsByEdrpou(contracts).length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    {searchEdrpouContracts ? 'Договорів з таким ЄДРПОУ не знайдено' : 'Немає договорів'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filterContractsByEdrpou(contracts).map((contract) => (
                      <Card 
                        key={contract._id} 
                        className={`card-hover ${currentTheme.cardBg} border-2 ${currentTheme.cardBorder} ${currentTheme.shadow} transition-all duration-300 group`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 cursor-pointer" onClick={() => openContractDialog(contract)}>
                              <p className={`font-medium ${currentTheme.text}`}>№{contract.number}</p>
                              <p className="text-sm text-gray-600">{contract.counterparty_name}</p>
                              <p className="text-sm">{contract.subject}</p>
                              <p className={`font-bold ${currentTheme.text}`}>{contract.amount} грн</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openContractDialog(contract);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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

          {/* Profile Tab */}
          {/* Profile Tab removed - now in dialog */}
          <TabsContent value="profile_removed" className="space-y-6 hidden">
            <Card>
              <CardHeader>
                <CardTitle>Профіль користувача</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Data Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Особисті дані</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>ПІБ</Label>
                      <Input
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                        placeholder="Іван Іванович Іваненко"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={profileData.email}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label>Назва компанії</Label>
                      <Input
                        value={profileData.company_name}
                        onChange={(e) => setProfileData({...profileData, company_name: e.target.value})}
                        placeholder="ТОВ Приклад"
                      />
                    </div>
                    <div>
                      <Label>Телефон</Label>
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        placeholder="+380501234567"
                      />
                    </div>
                  </div>
                </div>

                {/* Supplier Data Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Реквізити постачальника</h3>
                  
                  {/* EDRPOU with YouScore */}
                  <div className="mb-4">
                    <Label>Код ЄДРПОУ</Label>
                    <div className="flex gap-2">
                      <Input
                        value={profileData.edrpou}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setProfileData({...profileData, edrpou: value});
                          }
                        }}
                        placeholder="12345678 або 1234567890"
                        maxLength={10}
                      />
                      <Button
                        onClick={fetchYouScoreDataForProfile}
                        disabled={loadingProfile || !profileData.edrpou || profileData.edrpou.length < 8}
                      >
                        {loadingProfile ? 'Завантаження...' : 'Отримати дані'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      8 цифр для юридичної особи, 10 цифр для ФОП
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Повна назва</Label>
                      <Input
                        value={profileData.representative_name}
                        onChange={(e) => setProfileData({...profileData, representative_name: e.target.value})}
                        placeholder="ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Юридична адреса</Label>
                      <Input
                        value={profileData.legal_address}
                        onChange={(e) => setProfileData({...profileData, legal_address: e.target.value})}
                        placeholder="м. Київ, вул. Хрещатик, 1"
                      />
                    </div>
                    <div>
                      <Label>IBAN</Label>
                      <Input
                        value={profileData.iban}
                        onChange={(e) => setProfileData({...profileData, iban: e.target.value})}
                        placeholder="UA123456789012345678901234567"
                      />
                    </div>
                    <div>
                      <Label>Банк</Label>
                      <Input
                        value={profileData.bank}
                        onChange={(e) => setProfileData({...profileData, bank: e.target.value})}
                        placeholder="АТ КБ ПриватБанк"
                      />
                    </div>
                    <div>
                      <Label>МФО</Label>
                      <Input
                        value={profileData.mfo}
                        onChange={(e) => setProfileData({...profileData, mfo: e.target.value})}
                        placeholder="305299"
                      />
                    </div>
                    <div>
                      <Label>ПІБ керівника</Label>
                      <Input
                        value={profileData.director_name}
                        onChange={(e) => setProfileData({...profileData, director_name: e.target.value})}
                        placeholder="Іванов Іван Іванович"
                      />
                    </div>
                    <div>
                      <Label>Посада керівника</Label>
                      <Input
                        value={profileData.director_position}
                        onChange={(e) => setProfileData({...profileData, director_position: e.target.value})}
                        placeholder="Директор"
                      />
                    </div>
                    <div>
                      <Label>Посада підписанта</Label>
                      <Input
                        value={profileData.position}
                        onChange={(e) => setProfileData({...profileData, position: e.target.value})}
                        placeholder="Директор"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>В особі (автозаповнюється)</Label>
                      <Input
                        value={profileData.represented_by}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Підпис</Label>
                      <Input
                        value={profileData.signature}
                        onChange={(e) => setProfileData({...profileData, signature: e.target.value})}
                        placeholder="Іванов І.І."
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={saveUserProfile}
                    disabled={loadingProfile}
                    size="lg"
                  >
                    {loadingProfile ? 'Збереження...' : 'Зберегти профіль'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Counterparty Details Dialog */}
      <Dialog open={showCounterpartyDialog} onOpenChange={setShowCounterpartyDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingCounterparty ? 'Редагування Контрагента' : 'Картка Контрагента'}
            </DialogTitle>
          </DialogHeader>
          
          {viewingCounterparty && !editingCounterparty && (
            <div className="space-y-6">
              {/* View Mode - Counterparty Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">ЄДРПОУ</Label>
                  <p className="text-lg font-semibold">{viewingCounterparty.edrpou}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Назва</Label>
                  <p className="text-lg font-semibold">{viewingCounterparty.representative_name}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-600">Юридична адреса</Label>
                  <p className="text-lg">{viewingCounterparty.legal_address || 'Не вказано'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">р/р (IBAN)</Label>
                  <p className="text-lg font-mono">{viewingCounterparty.iban}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Банк</Label>
                  <p className="text-lg">{viewingCounterparty.bank || 'Не вказано'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">МФО</Label>
                  <p className="text-lg">{viewingCounterparty.mfo || 'Не вказано'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Email</Label>
                  <p className="text-lg">{viewingCounterparty.email}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Телефон</Label>
                  <p className="text-lg">{viewingCounterparty.phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">ПІБ керівника</Label>
                  <p className="text-lg">{viewingCounterparty.director_name || 'Не вказано'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Посада</Label>
                  <p className="text-lg">{viewingCounterparty.position || 'Не вказано'}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-600">В особі</Label>
                  <p className="text-lg">{viewingCounterparty.represented_by || 'Не вказано'}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-600">Підпис</Label>
                  <p className="text-lg">{viewingCounterparty.signature || 'Не вказано'}</p>
                </div>
              </div>

              {/* Documents Section */}
              {counterpartyDocuments && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Документи контрагента</h3>
                  
                  <div className="space-y-4">
                    {/* Orders */}
                    {counterpartyDocuments.orders?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Замовлення ({counterpartyDocuments.orders.length})</h4>
                        <div className="space-y-2">
                          {counterpartyDocuments.orders.map((order) => (
                            <Card key={order._id}>
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">№{order.number}</p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(order.date).toLocaleDateString('uk-UA')}
                                    </p>
                                  </div>
                                  <p className="font-bold">{order.total_amount} грн</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoices */}
                    {counterpartyDocuments.invoices?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Рахунки ({counterpartyDocuments.invoices.length})</h4>
                        <div className="space-y-2">
                          {counterpartyDocuments.invoices.map((invoice) => (
                            <Card key={invoice._id}>
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">№{invoice.number}</p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(invoice.date).toLocaleDateString('uk-UA')}
                                    </p>
                                  </div>
                                  <p className="font-bold">{invoice.total_amount} грн</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acts, Waybills, Contracts similar... */}
                    
                    {counterpartyDocuments.orders?.length === 0 && 
                     counterpartyDocuments.invoices?.length === 0 && 
                     counterpartyDocuments.acts?.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Немає документів для цього контрагента
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {editingCounterparty && (
            <div className="space-y-4">
              {/* Edit Mode - Editable Form (similar to creation form) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_edrpou">ЄДРПОУ *</Label>
                  <Input
                    id="edit_edrpou"
                    value={counterpartyForm.edrpou}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">ЄДРПОУ не можна змінювати</p>
                </div>
                
                <div>
                  <Label htmlFor="edit_name">Назва *</Label>
                  <Input
                    id="edit_name"
                    value={counterpartyForm.representative_name}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, representative_name: e.target.value}))}
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="edit_address">Юридична адреса</Label>
                  <Input
                    id="edit_address"
                    value={counterpartyForm.legal_address}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, legal_address: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_email">Email *</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={counterpartyForm.email}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, email: e.target.value}))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_phone">Телефон *</Label>
                  <Input
                    id="edit_phone"
                    value={counterpartyForm.phone}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, phone: e.target.value}))}
                    placeholder="+380501234567"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_iban">IBAN *</Label>
                  <Input
                    id="edit_iban"
                    value={counterpartyForm.iban}
                    onChange={(e) => handleIBANChange(e.target.value)}
                    placeholder="UA123456789012345678901234567"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">МФО: 6 цифр після перших 4 символів</p>
                </div>
                
                <div>
                  <Label htmlFor="edit_bank">Назва банку</Label>
                  <Input
                    id="edit_bank"
                    value={counterpartyForm.bank}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, bank: e.target.value}))}
                    placeholder="АТ КБ 'ПриватБанк'"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_mfo">МФО банку (автоматично з IBAN)</Label>
                  <Input
                    id="edit_mfo"
                    value={counterpartyForm.mfo}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, mfo: e.target.value}))}
                    placeholder="305299"
                    maxLength={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_director">ПІБ керівника</Label>
                  <Input
                    id="edit_director"
                    value={counterpartyForm.director_name}
                    onChange={(e) => handleDirectorNameChange(e.target.value)}
                    placeholder="Чорний Станіслав Іванович"
                  />
                  <p className="text-xs text-gray-500 mt-1">Формат: Прізвище Ім'я По-батькові</p>
                </div>
                
                <div>
                  <Label htmlFor="edit_position">Посада</Label>
                  <Input
                    id="edit_position"
                    value={counterpartyForm.position}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    placeholder="Директор"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_basis">Діє на підставі</Label>
                  <select
                    id="edit_basis"
                    value={counterpartyForm.contract_type}
                    onChange={(e) => handleBasisChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Статуту">Статуту</option>
                    <option value="Довіреності">Довіреності</option>
                    <option value="Виписка">Виписки з ЄДР</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Для автозаповнення "В особі"</p>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="edit_represented">В особі (формується автоматично)</Label>
                  <Input
                    id="edit_represented"
                    value={counterpartyForm.represented_by}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, represented_by: e.target.value}))}
                    placeholder="директора Чорного Станіслава Івановича, що діє на підставі Статуту"
                  />
                  <p className="text-xs text-gray-500 mt-1">Автоматично: посада (родовий) + ПІБ (родовий) + підстава</p>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="edit_signature">Підпис (автоматично з ПІБ)</Label>
                  <Input
                    id="edit_signature"
                    value={counterpartyForm.signature}
                    onChange={(e) => setCounterpartyForm(prev => ({...prev, signature: e.target.value}))}
                    placeholder="Станіслав ЧОРНИЙ"
                  />
                  <p className="text-xs text-gray-500 mt-1">Формат: Ім'я ПРІЗВИЩЕ</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            {!editingCounterparty ? (
              <>
                <Button 
                  variant="destructive" 
                  onClick={deleteCounterparty}
                  disabled={loading}
                >
                  {loading ? 'Видалення...' : 'Видалити'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={openEmailDialog}>
                    Відправити на Email
                  </Button>
                  <Button variant="outline" onClick={previewCounterpartyPDF}>
                    Переглянути PDF
                  </Button>
                  <Button variant="outline" onClick={downloadCounterpartyPDF}>
                    Завантажити PDF
                  </Button>
                  <Button variant="outline" onClick={startEditingCounterparty}>
                    Редагувати
                  </Button>
                  <Button onClick={closeCounterpartyDialog}>
                    Закрити
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditingCounterparty}>
                    Скасувати
                  </Button>
                  <Button 
                    onClick={saveCounterpartyChanges} 
                    disabled={loading}
                    className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
                  >
                    {loading ? 'Збереження...' : 'Зберегти зміни'}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Sending Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {emailType === 'order' ? 'Відправити замовлення на Email' : 'Відправити картку на Email'}
            </DialogTitle>
            {emailType === 'order' && viewingOrder && (
              <DialogDescription>
                Замовлення №{viewingOrder.number} | {viewingOrder.counterparty_name}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email_recipient">Email адреса отримувача</Label>
              <Input
                id="email_recipient"
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="email@example.com"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailType === 'order' && emailRecipient ? 
                  `Email контрагента: ${emailRecipient}` :
                  viewingCounterparty && viewingCounterparty.email ? 
                  `За замовчуванням: ${viewingCounterparty.email}` : 
                  'Введіть email адресу отримувача'
                }
              </p>
            </div>
            
            {emailType === 'order' && viewingOrder && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Буде відправлено:</strong> PDF замовлення з детальною інформацією про товари/послуги та загальною сумою {viewingOrder.total_amount?.toFixed(2)} грн
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeEmailDialog}>
              Скасувати
            </Button>
            <Button onClick={handleSendEmail} disabled={loading || !emailRecipient}>
              {loading ? 'Відправка...' : 'Відправити'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Замовлення №{viewingOrder?.number}
            </DialogTitle>
            <DialogDescription>
              {viewingOrder?.counterparty_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingOrder && !editingOrder && (
            <div className="space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Номер замовлення</Label>
                  <p className="text-lg font-semibold">№{viewingOrder.number}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Дата</Label>
                  <p className="text-lg font-semibold">{formatDateUkrainian(viewingOrder.date)}</p>
                </div>
              </div>
              
              {/* Counterparty Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Контрагент</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600">ЄДРПОУ</Label>
                    <p className="font-medium">{viewingOrder.counterparty_edrpou}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Назва</Label>
                    <p className="font-medium">{viewingOrder.counterparty_name}</p>
                  </div>
                </div>
              </div>
              
              {/* Items Table */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Товари та послуги</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">№</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Найменування</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Од.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Кільк.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Ціна</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOrder.items?.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{item.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50 font-semibold">
                      <tr>
                        <td colSpan="5" className="px-3 py-3 text-right">Загальна сума:</td>
                        <td className="px-3 py-3 text-right text-lg text-blue-700">
                          {viewingOrder.total_amount?.toFixed(2)} грн
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {editingOrder && (
            <div className="space-y-6">
              {/* Date and Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Номер замовлення</Label>
                  <Input value={viewingOrder.number} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={editOrderForm.date}
                    onChange={(e) => setEditOrderForm({...editOrderForm, date: e.target.value})}
                  />
                </div>
              </div>

              {/* Counterparty (read-only) */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Контрагент</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">ЄДРПОУ</Label>
                    <Input value={editOrderForm.counterparty_edrpou} disabled className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-sm">Назва</Label>
                    <Input value={editOrderForm.counterparty_name} disabled className="bg-white" />
                  </div>
                </div>
              </div>

              {/* Items Edit Table */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900">Товари та послуги</h3>
                  <Button size="sm" onClick={addEditOrderItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Додати позицію
                  </Button>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">№</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Найменування</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Од.</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-600">Кількість</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-600">Ціна</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-600">Сума</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editOrderForm.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-2">{index + 1}</td>
                          <td className="px-2 py-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateEditOrderItem(index, 'name', e.target.value)}
                              placeholder="Назва товару/послуги"
                              className="min-w-[200px]"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateEditOrderItem(index, 'unit', e.target.value)}
                              placeholder="шт"
                              className="w-16"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateEditOrderItem(index, 'quantity', e.target.value)}
                              className="w-24 text-right"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateEditOrderItem(index, 'price', e.target.value)}
                              className="w-28 text-right"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium">
                            {item.amount.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeEditOrderItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50 font-semibold">
                      <tr>
                        <td colSpan="5" className="px-3 py-3 text-right">Загальна сума:</td>
                        <td className="px-3 py-3 text-right text-lg text-blue-700">
                          {editOrderForm.total_amount.toFixed(2)} грн
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            {!editingOrder && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={deleteOrder}
                  disabled={loading}
                >
                  {loading ? 'Видалення...' : 'Видалити'}
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (viewingOrder) {
                        setShowOrderDialog(false);
                        openOrderEmailDialog();
                      }
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Відправити Email
                  </Button>
                  <Button variant="outline" onClick={previewOrderPDF}>
                    <Eye className="w-4 h-4 mr-2" />
                    Переглянути PDF
                  </Button>
                  <Button variant="outline" onClick={startEditingOrder}>
                    <Edit className="w-4 h-4 mr-2" />
                    Редагувати
                  </Button>
                  <Button onClick={closeOrderDialog}>
                    Закрити
                  </Button>
                </div>
              </>
            )}
            {editingOrder && (
              <>
                <Button 
                  variant="outline" 
                  onClick={cancelEditingOrder}
                  disabled={loading}
                >
                  Скасувати
                </Button>
                <Button 
                  onClick={saveEditedOrder}
                  disabled={loading}
                  className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  {loading ? 'Збереження...' : 'Зберегти зміни'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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


      {/* Act Details Dialog */}
      <Dialog open={showActDialog} onOpenChange={closeActDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Акт №{viewingAct?.number}</DialogTitle>
            <DialogDescription>{viewingAct?.counterparty_name}</DialogDescription>
          </DialogHeader>
          
          {viewingAct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm text-gray-600">Номер акту</Label><p className="text-lg font-semibold">№{viewingAct.number}</p></div>
                <div><Label className="text-sm text-gray-600">Дата</Label><p className="text-lg font-semibold">{formatDateUkrainian(viewingAct.date)}</p></div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Контрагент</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm text-gray-600">ЄДРПОУ</Label><p className="font-medium">{viewingAct.counterparty_edrpou}</p></div>
                  <div><Label className="text-sm text-gray-600">Назва</Label><p className="font-medium">{viewingAct.counterparty_name}</p></div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Виконані роботи</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="text-left p-2 border-b">Найменування</th>
                        <th className="text-center p-2 border-b">Од.</th>
                        <th className="text-right p-2 border-b">Кількість</th>
                        <th className="text-right p-2 border-b">Ціна</th>
                        <th className="text-right p-2 border-b">Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingAct.items?.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-center">{item.unit}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.price.toFixed(2)} грн</td>
                          <td className="p-2 text-right font-semibold">{item.amount.toFixed(2)} грн</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-lg font-bold text-purple-900">Всього: {viewingAct.total_amount.toFixed(2)} грн</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => { setEmailType('act'); setShowEmailDialog(true); }}
              className={`border-2 ${currentTheme.border} ${currentTheme.hover} ${currentTheme.textLight} hover:scale-105 transition-all duration-300`}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadActPDF}
              className={`border-2 ${currentTheme.border} ${currentTheme.hover} ${currentTheme.textLight} hover:scale-105 transition-all duration-300`}
            >
              <Download className="w-4 h-4 mr-2" /> Завантажити
            </Button>
            <Button 
              onClick={previewActPDF}
              className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
            >
              <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
            </Button>
            <Button variant="destructive" onClick={deleteAct} className="hover:scale-105 transition-all duration-300">
              <Trash2 className="w-4 h-4 mr-2" /> Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waybill Details Dialog */}
      <Dialog open={showWaybillDialog} onOpenChange={closeWaybillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Видаткова накладна №{viewingWaybill?.number}</DialogTitle>
            <DialogDescription>{viewingWaybill?.counterparty_name}</DialogDescription>
          </DialogHeader>
          
          {viewingWaybill && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm text-gray-600">Номер накладної</Label><p className="text-lg font-semibold">№{viewingWaybill.number}</p></div>
                <div><Label className="text-sm text-gray-600">Дата</Label><p className="text-lg font-semibold">{formatDateUkrainian(viewingWaybill.date)}</p></div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-900 mb-2">Контрагент</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm text-gray-600">ЄДРПОУ</Label><p className="font-medium">{viewingWaybill.counterparty_edrpou}</p></div>
                  <div><Label className="text-sm text-gray-600">Назва</Label><p className="font-medium">{viewingWaybill.counterparty_name}</p></div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Товари</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="text-left p-2 border-b">Найменування</th>
                        <th className="text-center p-2 border-b">Од.</th>
                        <th className="text-right p-2 border-b">Кількість</th>
                        <th className="text-right p-2 border-b">Ціна</th>
                        <th className="text-right p-2 border-b">Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingWaybill.items?.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-center">{item.unit}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.price.toFixed(2)} грн</td>
                          <td className="p-2 text-right font-semibold">{item.amount.toFixed(2)} грн</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-lg font-bold text-orange-900">Всього: {viewingWaybill.total_amount.toFixed(2)} грн</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => { setEmailType('waybill'); setShowEmailDialog(true); }}
              className={`border-2 ${currentTheme.border} ${currentTheme.hover} ${currentTheme.textLight} hover:scale-105 transition-all duration-300`}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadWaybillPDF}
              className={`border-2 ${currentTheme.border} ${currentTheme.hover} ${currentTheme.textLight} hover:scale-105 transition-all duration-300`}
            >
              <Download className="w-4 h-4 mr-2" /> Завантажити
            </Button>
            <Button 
              onClick={previewWaybillPDF}
              className={`${currentTheme.buttonBg} ${currentTheme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
            >
              <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
            </Button>
            <Button variant="destructive" onClick={deleteWaybill} className="hover:scale-105 transition-all duration-300">
              <Trash2 className="w-4 h-4 mr-2" /> Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Профіль користувача</DialogTitle>
            <DialogDescription>Заповніть дані вашої компанії для генерації документів</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* EDRPOU Section with YouScore */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold pb-2 border-b">Код ЄДРПОУ</h3>
              <div>
                <Label htmlFor="profile_edrpou">
                  ЄДРПОУ * 
                  {searchingEdrpouProfile && (
                    <span className="text-xs text-teal-600 ml-2">
                      (пошук даних...)
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="profile_edrpou"
                    type="text"
                    inputMode="numeric"
                    value={profileData.edrpou}
                    onChange={(e) => handleProfileEdrpouChange(e.target.value)}
                    placeholder="12345678 або 1234567890"
                    maxLength={10}
                    disabled={searchingEdrpouProfile}
                  />
                  {(profileData.edrpou.length === 8 || profileData.edrpou.length === 10) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => searchByEdrpouProfile(profileData.edrpou)}
                      disabled={searchingEdrpouProfile}
                    >
                      {searchingEdrpouProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Дані підтягуються автоматично при введенні 8 цифр (ЮрОсоба) або 10 цифр (ФОП)
                </p>
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold pb-2 border-b">Дані компанії</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="profile_representative_name">
                    Повна назва * 
                    {searchingEdrpouProfile && (
                      <span className="text-xs text-teal-600 ml-2">
                        (оновлюється...)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="profile_representative_name"
                    value={profileData.representative_name}
                    onChange={(e) => setProfileData({...profileData, representative_name: e.target.value})}
                    placeholder="ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="profile_legal_address">
                    Юридична адреса *
                    {searchingEdrpouProfile && (
                      <span className="text-xs text-teal-600 ml-2">
                        (оновлюється...)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="profile_legal_address"
                    value={profileData.legal_address}
                    onChange={(e) => setProfileData({...profileData, legal_address: e.target.value})}
                    placeholder="Автоматично заповниться за ЄДРПОУ або введіть вручну"
                  />
                </div>
                <div>
                  <Label htmlFor="profile_email">Email *</Label>
                  <Input
                    id="profile_email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="profile_phone">Телефон *</Label>
                  <Input
                    id="profile_phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    placeholder="+380501234567"
                  />
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold pb-2 border-b">Банківські реквізити</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profile_iban">
                    IBAN *
                    <span className="text-xs text-gray-500 ml-2">
                      (МФО формується автоматично)
                    </span>
                  </Label>
                  <Input
                    id="profile_iban"
                    value={profileData.iban}
                    onChange={(e) => handleProfileIBANChange(e.target.value)}
                    placeholder="UA593052990000026008034909558"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    МФО: 6 цифр після перших 4 символів
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile_bank">Назва банку</Label>
                  <Input
                    id="profile_bank"
                    value={profileData.bank}
                    onChange={(e) => setProfileData({...profileData, bank: e.target.value})}
                    placeholder="АТ КБ 'ПриватБанк'"
                  />
                </div>
                <div>
                  <Label htmlFor="profile_mfo">
                    МФО банку
                    <span className="text-xs text-teal-600 ml-2">
                      (автоматично з IBAN)
                    </span>
                  </Label>
                  <Input
                    id="profile_mfo"
                    value={profileData.mfo}
                    onChange={(e) => setProfileData({...profileData, mfo: e.target.value})}
                    placeholder="305299"
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Director & Legal Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold pb-2 border-b">Керівництво та підписи</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profile_director_name">ПІБ керівника</Label>
                  <Input
                    id="profile_director_name"
                    value={profileData.director_name}
                    onChange={(e) => handleProfileDirectorNameChange(e.target.value)}
                    placeholder="Чорний Станіслав Іванович"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Формат: Прізвище Ім'я По-батькові
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile_position">Посада</Label>
                  <Input
                    id="profile_position"
                    value={profileData.position}
                    onChange={(e) => handleProfilePositionChange(e.target.value)}
                    placeholder="Директор"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Для автозаповнення "В особі"
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile_basis">Діє на підставі</Label>
                  <Select 
                    value={profileData.contract_type} 
                    onValueChange={handleProfileBasisChange}
                  >
                    <SelectTrigger id="profile_basis">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Статуту">Статуту</SelectItem>
                      <SelectItem value="Довіреності">Довіреності</SelectItem>
                      <SelectItem value="Виписка">Виписки з ЄДР</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="profile_represented_by">
                    В особі
                    <span className="text-xs text-teal-600 ml-2">
                      (формується автоматично)
                    </span>
                  </Label>
                  <Input
                    id="profile_represented_by"
                    value={profileData.represented_by}
                    onChange={(e) => setProfileData({...profileData, represented_by: e.target.value})}
                    placeholder="директора Чорного Станіслава Івановича, що діє на підставі Статуту"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Автоматично: посада (родовий) + ПІБ (родовий) + підстава
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile_signature">
                    Підпис
                    <span className="text-xs text-teal-600 ml-2">
                      (автоматично з ПІБ)
                    </span>
                  </Label>
                  <Input
                    id="profile_signature"
                    value={profileData.signature}
                    onChange={(e) => setProfileData({...profileData, signature: e.target.value})}
                    placeholder="Станіслав ЧОРНИЙ"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Формат: Ім'я ПРІЗВИЩЕ
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
            >
              Скасувати
            </Button>
            <Button
              onClick={saveUserProfile}
              disabled={loadingProfile}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {loadingProfile ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Збереження...</>
              ) : (
                'Зберегти профіль'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={closeContractDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-rose-700">Договір №{viewingContract?.number}</DialogTitle>
            <DialogDescription>{viewingContract?.counterparty_name}</DialogDescription>
          </DialogHeader>
          
          {viewingContract && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Номер договору</Label>
                  <p className="text-lg font-semibold">№{viewingContract.number}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Дата</Label>
                  <p className="text-lg font-semibold">{formatDateUkrainian(viewingContract.date)}</p>
                </div>
              </div>
              
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                <Label className="text-sm text-gray-600">Контрагент</Label>
                <p className="text-lg font-semibold">{viewingContract.counterparty_name}</p>
                <p className="text-sm text-gray-600">ЄДРПОУ: {viewingContract.counterparty_edrpou}</p>
              </div>

              {viewingContract.based_on_order && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-700">
                    📋 Створено на основі замовлення №{viewingContract.based_on_order}
                  </p>
                </div>
              )}
              
              <div>
                <Label className="text-sm text-gray-600">Предмет договору</Label>
                <p className="text-base mt-1 p-3 bg-gray-50 rounded">{viewingContract.subject}</p>
              </div>

              {viewingContract.contract_type && (
                <div>
                  <Label className="text-sm text-gray-600">Тип договору</Label>
                  <p className="text-base mt-1">{viewingContract.contract_type}</p>
                </div>
              )}
              
              <div className="bg-rose-100 p-4 rounded-lg border-2 border-rose-300">
                <Label className="text-sm text-gray-600">Загальна сума</Label>
                <p className="text-3xl font-bold text-rose-700">{viewingContract.amount.toFixed(2)} грн</p>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={viewContractPDF}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
                </Button>
                <Button 
                  onClick={sendContractEmail}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Mail className="w-4 h-4 mr-2" /> Надіслати Email
                </Button>
                <Button 
                  onClick={deleteContract}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Видалити
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default FullDashboard;
