import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  Mail, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  FileText, 
  Calendar, 
  Building2, 
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles
} from 'lucide-react';
import CommentsSection from '../comments/CommentsSection';

// Order status configurations
const ORDER_STATUSES = {
  new: {
    value: 'new',
    label: 'Нове',
    bgColor: 'bg-blue-500',
    icon: Sparkles
  },
  in_progress: {
    value: 'in_progress',
    label: 'В роботі',
    bgColor: 'bg-amber-500',
    icon: Clock
  },
  shipped: {
    value: 'shipped',
    label: 'Відправлено',
    bgColor: 'bg-purple-500',
    icon: Truck
  },
  paid: {
    value: 'paid',
    label: 'Сплачено',
    bgColor: 'bg-emerald-500',
    icon: CheckCircle2
  }
};

// Format date in Ukrainian
const formatDateUkrainian = (dateString) => {
  if (!dateString) return '';
  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year} року`;
};

// Format number with spaces for thousands
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const OrderCard = ({
  open,
  onOpenChange,
  order,
  editingOrder,
  editOrderForm,
  setEditOrderForm,
  loading,
  onDelete,
  onSendEmail,
  onPreviewPDF,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onClose,
  onStatusChange,
  supplierLogo
}) => {
  if (!order) return null;

  // Get current status - default to 'new' if not set
  const currentStatusKey = order.status || (order.is_paid ? 'paid' : 'new');
  const currentStatus = ORDER_STATUSES[currentStatusKey] || ORDER_STATUSES.new;
  const StatusIcon = currentStatus.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0 bg-transparent border-none shadow-none overflow-visible max-h-[90vh]">
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>Замовлення №{order.number}</DialogTitle>
          <DialogDescription>Деталі замовлення для {order.counterparty_name}</DialogDescription>
        </VisuallyHidden>
        
        {/* Outer container with light gray background */}
        <div className="bg-[#EEF2F5] p-6 rounded-[16px] max-h-[85vh] overflow-y-auto">
          {/* Main Card */}
          <div 
            className="bg-white rounded-[12px] relative"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* Card Content */}
            <div className="p-8">
              {/* View Mode */}
              {!editingOrder && (
                <>
                  {/* Block 1: Hero */}
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-start gap-4">
                      {/* Logo placeholder or icon */}
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-[24px] font-semibold text-[#1B1B1B] tracking-tight">
                          Замовлення №{order.number}
                        </h1>
                        <p className="text-[14px] text-gray-500 mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDateUkrainian(order.date)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Dropdown */}
                    <Select 
                      value={currentStatusKey} 
                      onValueChange={(value) => onStatusChange && onStatusChange(order.number, value)}
                    >
                      <SelectTrigger 
                        className={`w-[160px] ${currentStatus.bgColor} text-white border-none focus:ring-0 focus:ring-offset-0`}
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ORDER_STATUSES).map(([key, status]) => {
                          const Icon = status.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span>{status.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Block 2: Order Parameters */}
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div>
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Номер
                      </p>
                      <p className="text-[16px] font-semibold text-[#1B1B1B]">
                        №{order.number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Дата створення
                      </p>
                      <p className="text-[16px] font-semibold text-[#1B1B1B]">
                        {formatDateUkrainian(order.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Загальна сума
                      </p>
                      <p className="text-[18px] font-bold text-blue-600">
                        {formatAmount(order.total_amount)} грн
                      </p>
                    </div>
                  </div>

                  {/* Block 3: Order Items - ТОВАРИ ТА ПОСЛУГИ */}
                  <div className="mb-8">
                    <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      ТОВАРИ ТА ПОСЛУГИ
                    </h2>
                    
                    {/* Items Header */}
                    <div className="bg-gray-50 rounded-t-lg px-4 py-3 grid grid-cols-12 gap-2 text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
                      <div className="col-span-1">№</div>
                      <div className="col-span-5">Найменування</div>
                      <div className="col-span-1 text-center">Од.</div>
                      <div className="col-span-2 text-right">Кількість</div>
                      <div className="col-span-1 text-right">Ціна</div>
                      <div className="col-span-2 text-right">Сума</div>
                    </div>
                    
                    {/* Items List */}
                    <div className="border border-gray-100 border-t-0 rounded-b-lg divide-y divide-gray-100">
                      {order.items?.map((item, index) => (
                        <div 
                          key={index}
                          className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="col-span-1 text-[13px] text-gray-500">
                            {index + 1}
                          </div>
                          <div className="col-span-5 text-[14px] font-medium text-[#1B1B1B]">
                            {item.name}
                          </div>
                          <div className="col-span-1 text-[13px] text-gray-500 text-center">
                            {item.unit}
                          </div>
                          <div className="col-span-2 text-[14px] text-[#1B1B1B] text-right">
                            {item.quantity}
                          </div>
                          <div className="col-span-1 text-[14px] text-[#1B1B1B] text-right">
                            {formatAmount(item.price)}
                          </div>
                          <div className="col-span-2 text-[14px] font-semibold text-[#1B1B1B] text-right">
                            {formatAmount(item.amount)} грн
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total Amount - Premium Style */}
                    <div className="mt-4 bg-blue-50 rounded-xl p-5 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-[15px] font-semibold text-blue-900">
                          Загальна сума замовлення:
                        </span>
                        <span className="text-[22px] font-bold text-blue-600">
                          {formatAmount(order.total_amount)} грн
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Block 4: Customer/Buyer Details - ПОКУПЕЦЬ */}
                  <div className="bg-[#F7F9FA] rounded-xl p-6 mb-8">
                    <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      ПОКУПЕЦЬ
                    </h2>
                    
                    {/* Two-column layout for buyer details */}
                    <div className="space-y-3">
                      {/* Повна назва */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Повна назва
                        </span>
                        <span className="text-[14px] font-semibold text-[#1B1B1B]">
                          {order.counterparty_name || '—'}
                        </span>
                      </div>
                      
                      {/* Код ЄДРПОУ */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Код ЄДРПОУ
                        </span>
                        <span className="text-[14px] font-semibold text-[#1B1B1B]">
                          {order.counterparty_edrpou || '—'}
                        </span>
                      </div>
                      
                      {/* Юридична адреса */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Юридична адреса
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_address || order.buyer_address || '—'}
                        </span>
                      </div>
                      
                      {/* Телефон */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Телефон
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_phone || order.buyer_phone || '—'}
                        </span>
                      </div>
                      
                      {/* Email */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Email
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_email || order.buyer_email || '—'}
                        </span>
                      </div>
                      
                      {/* Банк */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Банк
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_bank || order.buyer_bank || '—'}
                        </span>
                      </div>
                      
                      {/* IBAN */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          IBAN
                        </span>
                        <span className="text-[14px] text-[#1B1B1B] font-mono">
                          {order.counterparty_iban || order.buyer_iban || '—'}
                        </span>
                      </div>
                      
                      {/* МФО */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          МФО
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_mfo || order.buyer_mfo || '—'}
                        </span>
                      </div>
                      
                      {/* Директор */}
                      <div className="flex items-start py-2 border-b border-gray-200">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Директор
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_director || order.buyer_director || '—'}
                        </span>
                      </div>
                      
                      {/* Посада */}
                      <div className="flex items-start py-2">
                        <span className="text-[13px] font-medium text-gray-500 w-40 flex-shrink-0">
                          Посада
                        </span>
                        <span className="text-[14px] text-[#1B1B1B]">
                          {order.counterparty_position || order.buyer_position || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Block 5: Control Message */}
                  <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-100">
                    <p className="text-[14px] font-semibold text-blue-900 mb-1">
                      Замовлення готове до обробки
                    </p>
                    <p className="text-[13px] text-blue-700">
                      Ви можете переглянути PDF, надіслати на email або редагувати дані замовлення.
                    </p>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-gray-100 pt-6">
                    <CommentsSection entityType="order" entityId={order.number} />
                  </div>

                  {/* Block 6: Footer / Actions */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      onClick={onDelete}
                      disabled={loading}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {loading ? 'Видалення...' : 'Видалити'}
                    </Button>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={onSendEmail}
                        className="border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Mail className="w-4 h-4 mr-2 text-blue-500" />
                        Email
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={onPreviewPDF}
                        className="border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-2 text-blue-500" />
                        Переглянути PDF
                      </Button>
                      <Button 
                        onClick={onStartEdit}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Редагувати
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Edit Mode */}
              {editingOrder && editOrderForm && (
                <>
                  {/* Hero for Edit */}
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                        <Edit className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-[24px] font-semibold text-[#1B1B1B] tracking-tight">
                          Редагування замовлення
                        </h1>
                        <p className="text-[14px] text-gray-500 mt-1">
                          №{order.number}
                        </p>
                      </div>
                    </div>
                    
                    {/* Edit Mode Badge */}
                    <div className="bg-amber-500 px-4 py-2 rounded-full">
                      <span className="text-[13px] font-semibold text-white">
                        Режим редагування
                      </span>
                    </div>
                  </div>

                  {/* Edit: Date */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                        Номер замовлення
                      </Label>
                      <Input 
                        value={order.number} 
                        disabled 
                        className="bg-gray-50 border-gray-200 text-[15px]" 
                      />
                    </div>
                    <div>
                      <Label className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                        Дата
                      </Label>
                      <Input
                        type="date"
                        value={editOrderForm.date}
                        onChange={(e) => setEditOrderForm({...editOrderForm, date: e.target.value})}
                        className="border-gray-200 text-[15px]"
                      />
                    </div>
                  </div>

                  {/* Edit: Counterparty (read-only) */}
                  <div className="bg-[#F7F9FA] rounded-xl p-6 mb-6">
                    <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      Замовник
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                          ЄДРПОУ
                        </Label>
                        <Input 
                          value={editOrderForm.counterparty_edrpou} 
                          disabled 
                          className="bg-white border-gray-200" 
                        />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                          Назва
                        </Label>
                        <Input 
                          value={editOrderForm.counterparty_name} 
                          disabled 
                          className="bg-white border-gray-200" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Edit: Items */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-[16px] font-semibold text-[#1B1B1B] flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Позиції
                      </h2>
                      <Button 
                        size="sm" 
                        onClick={onAddItem}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Додати
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {editOrderForm.items.map((item, index) => (
                        <div 
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-[12px] font-medium text-gray-400 mt-2.5">
                              {index + 1}.
                            </span>
                            <div className="flex-1 space-y-3">
                              <Input
                                value={item.name}
                                onChange={(e) => onUpdateItem(index, 'name', e.target.value)}
                                placeholder="Назва товару/послуги"
                                className="bg-white border-gray-200 text-[14px]"
                              />
                              <div className="grid grid-cols-4 gap-3">
                                <Input
                                  value={item.unit}
                                  onChange={(e) => onUpdateItem(index, 'unit', e.target.value)}
                                  placeholder="Од."
                                  className="bg-white border-gray-200 text-[14px]"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                                  placeholder="Кільк."
                                  className="bg-white border-gray-200 text-[14px] text-right"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => onUpdateItem(index, 'price', e.target.value)}
                                  placeholder="Ціна"
                                  className="bg-white border-gray-200 text-[14px] text-right"
                                />
                                <div className="flex items-center justify-between">
                                  <span className="text-[14px] font-semibold text-[#1B1B1B]">
                                    {formatAmount(item.amount)} грн
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onRemoveItem(index)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total in Edit Mode */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-gray-200">
                      <span className="text-[15px] font-semibold text-gray-600">
                        Загальна сума:
                      </span>
                      <span className="text-[20px] font-bold text-blue-600">
                        {formatAmount(editOrderForm.total_amount)} грн
                      </span>
                    </div>
                  </div>

                  {/* Edit Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      onClick={onCancelEdit}
                      disabled={loading}
                      className="border-gray-200"
                    >
                      Скасувати
                    </Button>
                    <Button 
                      onClick={onSaveEdit}
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6"
                    >
                      {loading ? 'Збереження...' : 'Зберегти зміни'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderCard;
