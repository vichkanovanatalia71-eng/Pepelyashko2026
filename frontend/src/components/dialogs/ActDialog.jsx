import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Eye, Mail, Edit, Trash2, Calendar, Building2, 
  Package, X, FileCheck
} from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import CommentsSection from '../comments/CommentsSection';

const ActDialog = ({
  open,
  onClose,
  act,
  theme,
  loading,
  onDelete,
  onEdit,
  onViewPDF,
  onSendEmail,
  formatDateUkrainian
}) => {
  if (!act) return null;

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1200px] p-0 bg-transparent border-none shadow-none overflow-visible max-h-[90vh]">
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>Акт №{act.number}</DialogTitle>
          <DialogDescription>Деталі акту для {act.counterparty_name}</DialogDescription>
        </VisuallyHidden>
        
        {/* Outer container with light gray background */}
        <div className="bg-[#EEF2F5] p-4 rounded-[16px] max-h-[85vh] overflow-y-auto">
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
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* Card Content */}
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-semibold text-[#1B1B1B] tracking-tight">
                      Акт №{act.number}
                    </h1>
                    <p className="text-[12px] text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateUkrainian(act.date)}
                    </p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Активний
                </span>
              </div>

              {/* Main Content - Horizontal Layout */}
              <div className="flex gap-4">
                {/* Left Column - Items */}
                <div className="flex-1 min-w-[500px]">
                  {/* Parameters Grid */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Номер</p>
                      <p className="text-sm font-semibold">№{act.number}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Дата</p>
                      <p className="text-sm font-semibold">{formatDateUkrainian(act.date)}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">ЄДРПОУ</p>
                      <p className="text-sm font-mono">{act.counterparty_edrpou}</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded text-center border border-purple-200">
                      <p className="text-[10px] text-gray-500 uppercase">Сума</p>
                      <p className="text-sm font-bold text-purple-600">{formatAmount(act.total_amount)} грн</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-4">
                    <h2 className="text-[13px] font-semibold text-[#1B1B1B] mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-500" />
                      ВИКОНАНІ РОБОТИ / ПОСЛУГИ
                    </h2>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-3 py-2 grid grid-cols-12 gap-1 text-[10px] font-semibold text-gray-500 uppercase">
                        <div className="col-span-1">№</div>
                        <div className="col-span-5">Найменування</div>
                        <div className="col-span-1 text-center">Од.</div>
                        <div className="col-span-2 text-right">К-сть</div>
                        <div className="col-span-1 text-right">Ціна</div>
                        <div className="col-span-2 text-right">Сума</div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {act.items?.map((item, index) => (
                          <div key={index} className="px-3 py-2 grid grid-cols-12 gap-1 items-center border-t border-gray-100 text-xs">
                            <div className="col-span-1 text-gray-500">{index + 1}</div>
                            <div className="col-span-5 font-medium truncate">{item.name}</div>
                            <div className="col-span-1 text-gray-500 text-center">{item.unit}</div>
                            <div className="col-span-2 text-right">{item.quantity || 0}</div>
                            <div className="col-span-1 text-right">{formatAmount(item.price)}</div>
                            <div className="col-span-2 text-right font-semibold">{formatAmount(item.amount)} грн</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Counterparty & Actions */}
                <div className="w-[320px] space-y-3">
                  {/* Counterparty - Compact */}
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h2 className="text-[12px] font-semibold text-[#1B1B1B] mb-2 flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      КОНТРАГЕНТ
                    </h2>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Назва:</span>
                        <span className="font-medium text-right max-w-[180px] truncate">{act.counterparty_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ЄДРПОУ:</span>
                        <span className="font-medium">{act.counterparty_edrpou || '—'}</span>
                      </div>
                      {act.counterparty_email && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="truncate max-w-[150px]">{act.counterparty_email}</span>
                        </div>
                      )}
                      {act.counterparty_phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Тел:</span>
                          <span>{act.counterparty_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="bg-purple-100 rounded-lg p-3 border border-purple-300 text-center">
                    <p className="text-[10px] text-gray-600 uppercase">Загальна сума</p>
                    <p className="text-xl font-bold text-purple-700">{formatAmount(act.total_amount)} грн</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button onClick={onViewPDF} disabled={loading} className="w-full bg-purple-500 hover:bg-purple-600 text-white h-9">
                      <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
                    </Button>
                    <Button variant="outline" onClick={onSendEmail} disabled={loading} className="w-full h-9 border-purple-300 hover:bg-purple-50">
                      <Mail className="w-4 h-4 mr-2 text-purple-500" /> Надіслати Email
                    </Button>
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button onClick={() => onEdit(act)} variant="outline" disabled={loading} className="flex-1 h-8 text-sm">
                          <Edit className="w-3 h-3 mr-1" /> Редагувати
                        </Button>
                      )}
                      <Button variant="destructive" onClick={onDelete} disabled={loading} className="flex-1 h-8 text-sm">
                        <Trash2 className="w-3 h-3 mr-1" /> Видалити
                      </Button>
                    </div>
                  </div>

                  {/* Comments - Compact */}
                  <div className="border rounded-lg p-2 max-h-[150px] overflow-y-auto">
                    <CommentsSection entityType="act" entityId={act.number} compact />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActDialog;
