import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, Mail, Trash2, FileText, Package, Settings, CheckCircle } from 'lucide-react';
import CommentsSection from '../comments/CommentsSection';

// Contract type labels
const CONTRACT_TYPE_LABELS = {
  'goods': 'Поставка товарів',
  'services': 'Надання послуг',
  'goods_and_services': 'Поставка товарів та надання послуг'
};

// Execution form labels
const EXECUTION_FORM_LABELS = {
  'one_time': 'Разова поставка / послуга',
  'periodic': 'Періодичне виконання',
  'with_specifications': 'З окремими специфікаціями',
  'annual_volume': 'В межах річного/квартального обсягу'
};

const ContractDialog = ({
  open,
  onClose,
  contract,
  loading,
  onDelete,
  onViewPDF,
  onSendEmail,
  formatDateUkrainian
}) => {
  if (!contract) return null;

  const contractTypeLabel = CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type || 'Не вказано';
  const executionFormLabel = EXECUTION_FORM_LABELS[contract.execution_form] || contract.execution_form || null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-rose-700">Договір №{contract.number}</DialogTitle>
          <DialogDescription>{contract.counterparty_name}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Номер договору</Label>
              <p className="text-lg font-semibold">№{contract.number}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Дата</Label>
              <p className="text-lg font-semibold">{formatDateUkrainian(contract.date)}</p>
            </div>
          </div>
          
          {/* Counterparty */}
          <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
            <Label className="text-sm text-gray-600">Контрагент</Label>
            <p className="text-lg font-semibold">{contract.counterparty_name}</p>
            <p className="text-sm text-gray-600">ЄДРПОУ: {contract.counterparty_edrpou}</p>
          </div>

          {/* Based on Order */}
          {contract.based_on_order && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                📋 Створено на основі замовлення №{contract.based_on_order}
              </p>
            </div>
          )}
          
          {/* Contract Type & Execution Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-rose-600" />
                <Label className="text-sm text-gray-600">Тип договору</Label>
              </div>
              <p className="text-base font-medium">{contractTypeLabel}</p>
            </div>
            {executionFormLabel && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4 text-rose-600" />
                  <Label className="text-sm text-gray-600">Формат виконання</Label>
                </div>
                <p className="text-base font-medium">{executionFormLabel}</p>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-rose-600" />
              <Label className="text-sm text-gray-600">Предмет договору</Label>
            </div>
            <p className="text-base mt-1 p-3 bg-gray-50 rounded">{contract.subject}</p>
          </div>

          {/* Additional Options */}
          {(contract.specification_required || contract.quantity_variation_allowed) && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-sm text-gray-600 mb-2 block">Додаткові умови</Label>
              <div className="space-y-2">
                {contract.specification_required && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Специфікація обов'язкова (кожна операція оформлюється окремим додатком)</span>
                  </div>
                )}
                {contract.quantity_variation_allowed && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Варіативність обсягу (можливість зміни обсягу в межах специфікацій)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="bg-rose-100 p-4 rounded-lg border-2 border-rose-300">
            <Label className="text-sm text-gray-600">Загальна сума</Label>
            <p className="text-3xl font-bold text-rose-700">{contract.amount?.toFixed(2) || '0.00'} грн</p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={onViewPDF}
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
            </Button>
            <Button 
              onClick={onSendEmail}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" /> Надіслати Email
            </Button>
            <Button 
              onClick={onDelete}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Видалити
            </Button>
          </div>
        </div>
          
          {/* Comments Section */}
          <CommentsSection entityType="contract" entityId={contract.number} />
      </DialogContent>
    </Dialog>
  );
};

export default ContractDialog;