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
  const [emailType, setEmailType] = useState('counterparty'); // 'counterparty' or 'order'
  
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
  const [editingOrder, setEditingOrder] = useState(false);
  
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
        let fullName = response.data.name || prev.representative_name;
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
            <TabsTrigger value="orders">
              <FileText className="w-4 h-4 mr-2" />
              Замовлення
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
                      <Card 
                        key={counterparty._id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => viewCounterpartyDetails(counterparty)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{counterparty.representative_name}</p>
                              <p className="text-sm text-gray-600">ЄДРПОУ: {counterparty.edrpou}</p>
                              <p className="text-sm text-gray-600">
                                {counterparty.email} | {counterparty.phone}
                              </p>
                            </div>
                            <Eye className="w-5 h-5 text-gray-400" />
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
                      <Card key={order._id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1" onClick={() => openOrderDialog(order)}>
                              <p className="font-medium">№{order.number}</p>
                              <p className="text-sm text-gray-600">{order.counterparty_name}</p>
                              <p className="font-bold">{order.total_amount} грн</p>
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
                    onChange={(e) => handleIbanChange(e.target.value)}
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
                  <Button onClick={saveCounterpartyChanges} disabled={loading}>
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
          
          {viewingOrder && (
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
          
          <DialogFooter className="flex justify-between">
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
              <Button variant="outline" onClick={downloadOrderPDF}>
                <Download className="w-4 h-4 mr-2" />
                Завантажити PDF
              </Button>
              <Button onClick={closeOrderDialog}>
                Закрити
              </Button>
            </div>
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
    </div>
  );
};

export default FullDashboard;
