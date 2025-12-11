import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertCircle
} from 'lucide-react';
import CommentsSection from '../comments/CommentsSection';

// Status badge configurations
const statusConfig = {
  pending: {
    label: 'Очікує підтвердження',
    bgColor: 'bg-amber-500',
    icon: Clock
  },
  confirmed: {
    label: 'Підтверджено',
    bgColor: 'bg-emerald-500',
    icon: CheckCircle2
  },
  processing: {
    label: 'В обробці',
    bgColor: 'bg-blue-500',
    icon: AlertCircle
  },
  completed: {
    label: 'Виконано',
    bgColor: 'bg-green-600',
    icon: CheckCircle2
  },
  paid: {
    label: 'Сплачено',
    bgColor: 'bg-emerald-600',
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
  supplierLogo
}) => {
  if (!order) return null;

  const status = order.is_paid ? 'paid' : (order.status || 'pending');
  const currentStatus = statusConfig[status] || statusConfig.pending;
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
                    
                    {/* Status Badge */}
                    <div 
                      className={`${currentStatus.bgColor} px-4 py-2 rounded-full flex items-center gap-2`}
                    >
                      <StatusIcon className="w-4 h-4 text-white" />
                      <span className="text-[13px] font-semibold text-white whitespace-nowrap">
                        {currentStatus.label}
                      </span>
                    </div>
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

                  {/* Block 3: Order Items */}
                  <div className="mb-8">
                    <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      Позиції замовлення
                    </h2>
                    <div className="space-y-3">
                      {order.items?.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="text-[15px] font-medium text-[#1B1B1B]">
                              {item.name}
                            </p>
                            <p className="text-[13px] text-gray-500 mt-0.5">
                              {item.quantity} {item.unit} × {formatAmount(item.price)} грн
                            </p>
                          </div>
                          <p className="text-[15px] font-semibold text-[#1B1B1B] ml-4">
                            {formatAmount(item.amount)} грн
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-gray-200">
                      <span className="text-[15px] font-semibold text-gray-600">
                        Всього до сплати:
                      </span>
                      <span className="text-[20px] font-bold text-blue-600">
                        {formatAmount(order.total_amount)} грн
                      </span>
                    </div>
                  </div>

                  {/* Block 4: Customer Details */}
                  <div className="bg-[#F7F9FA] rounded-xl p-6 mb-8">
                    <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      Реквізити замовника
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                          ЄДРПОУ
                        </p>
                        <p className="text-[15px] font-medium text-[#1B1B1B]">
                          {order.counterparty_edrpou}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                          Назва компанії
                        </p>
                        <p className="text-[15px] font-medium text-[#1B1B1B]">
                          {order.counterparty_name}
                        </p>
                      </div>
                      {order.counterparty_address && (
                        <div>
                          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                            Адреса
                          </p>
                          <p className="text-[15px] text-[#1B1B1B]">
                            {order.counterparty_address}
                          </p>
                        </div>
                      )}
                      {order.counterparty_email && (
                        <div>
                          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                            Email
                          </p>
                          <p className="text-[15px] text-[#1B1B1B]">
                            {order.counterparty_email}
                          </p>
                        </div>
                      )}
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
