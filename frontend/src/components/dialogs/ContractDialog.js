import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, Mail, Trash2, FileText, Package, Settings, CheckCircle, MapPin, 
  Shield, AlertTriangle, PenTool, Pencil, X, Save, Calendar, 
  FileCheck, Receipt, Truck, Clock, Download, Printer, Copy,
  Plus, ArrowRight, Building2, CreditCard, BadgeCheck, XCircle
} from 'lucide-react';
import CommentsSection from '../comments/CommentsSection';
import { toast } from 'sonner';

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

// Warranty period labels
const WARRANTY_PERIOD_LABELS = {
  '12_months': '12 місяців',
  '24_months': '24 місяці',
  '36_months': '36 місяців',
  'not_applicable': 'Не передбачено'
};

// Penalty rate labels
const PENALTY_RATE_LABELS = {
  '0.01': '0,01% на день',
  '0.05': '0,05% на день',
  '0.1': '0,1% на день',
  '0.5': '0,5% на день',
  '1.0': '1,0% на день',
  'not_applicable': 'Не передбачено'
};

// Signing format labels
const SIGNING_FORMAT_LABELS = {
  'paper': 'Паперовий примірник',
  'electronic': 'Електронний підпис (КЕП)',
  'both': 'Обидва варіанти'
};

// Contract status labels
const CONTRACT_STATUS_LABELS = {
  'draft': 'Чернетка',
  'active': 'Діючий',
  'completed': 'Виконано',
  'terminated': 'Розірвано',
  'expired': 'Завершено'
};

const CONTRACT_STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-700 border-gray-300',
  'active': 'bg-green-100 text-green-700 border-green-300',
  'completed': 'bg-blue-100 text-blue-700 border-blue-300',
  'terminated': 'bg-red-100 text-red-700 border-red-300',
  'expired': 'bg-orange-100 text-orange-700 border-orange-300'
};

const ContractDialog = ({
  open,
  onClose,
  contract,
  loading,
  onDelete,
  onViewPDF,
  onSendEmail,
  onUpdate,
  onStatusChange,
  onCreateInvoice,
  onCreateAct,
  onCreateWaybill,
  formatDateUkrainian
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    if (contract) {
      setEditForm({
        subject: contract.subject || '',
        amount: contract.amount || 0,
        contract_type: contract.contract_type || '',
        execution_form: contract.execution_form || '',
        delivery_address: contract.delivery_address || '',
        warranty_period: contract.warranty_period || '',
        penalty_rate: contract.penalty_rate || '',
        signing_format: contract.signing_format || '',
        specification_required: contract.specification_required || false,
        quantity_variation_allowed: contract.quantity_variation_allowed || false
      });
    }
  }, [contract]);

  if (!contract) return null;

  const contractTypeLabel = CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type || 'Не вказано';
  const executionFormLabel = EXECUTION_FORM_LABELS[contract.execution_form] || contract.execution_form || null;
  const warrantyPeriodLabel = WARRANTY_PERIOD_LABELS[contract.warranty_period] || contract.warranty_period || null;
  const penaltyRateLabel = PENALTY_RATE_LABELS[contract.penalty_rate] || contract.penalty_rate || null;
  const signingFormatLabel = SIGNING_FORMAT_LABELS[contract.signing_format] || contract.signing_format || null;
  const statusLabel = CONTRACT_STATUS_LABELS[contract.status] || 'Діючий';
  const statusColor = CONTRACT_STATUS_COLORS[contract.status] || CONTRACT_STATUS_COLORS['active'];

  // Generate contract term text
  const contractDate = contract.date ? new Date(contract.date) : new Date();
  const contractYear = contractDate.getFullYear();
  const contractTermText = `з ${formatDateUkrainian(contract.date)} до 31 грудня ${contractYear} року`;

  // Check if contract is still valid
  const endDate = new Date(contractYear, 11, 31);
  const isExpired = new Date() > endDate;
  const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(contract.number, editForm);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      subject: contract.subject || '',
      amount: contract.amount || 0,
      contract_type: contract.contract_type || '',
      execution_form: contract.execution_form || '',
      delivery_address: contract.delivery_address || '',
      warranty_period: contract.warranty_period || '',
      penalty_rate: contract.penalty_rate || '',
      signing_format: contract.signing_format || '',
      specification_required: contract.specification_required || false,
      quantity_variation_allowed: contract.quantity_variation_allowed || false
    });
    setIsEditing(false);
  };

  const copyContractNumber = () => {
    navigator.clipboard.writeText(contract.number);
    toast.success('Номер договору скопійовано');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl text-rose-700 flex items-center gap-2">
                  Договір №{contract.number}
                  <button onClick={copyContractNumber} className="p-1 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {contract.counterparty_name}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                {statusLabel}
              </span>
              {/* Edit/Save buttons */}
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-1" /> Редагувати
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" /> Скасувати
                  </Button>
                  <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4 mr-1" /> Зберегти
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Validity indicator */}
          {!isExpired ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <BadgeCheck className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Договір дійсний</span>
              <span className="text-green-600 text-sm">• залишилось {daysRemaining} днів</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">Термін дії договору закінчився</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500 uppercase">Номер</Label>
              <p className="text-lg font-bold text-gray-800">№{contract.number}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500 uppercase">Дата укладання</Label>
              <p className="text-lg font-semibold">{formatDateUkrainian(contract.date)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500 uppercase">ЄДРПОУ контрагента</Label>
              <p className="text-lg font-mono font-semibold">{contract.counterparty_edrpou}</p>
            </div>
          </div>
          
          {/* Contract Term */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <Label className="text-sm text-blue-700 font-medium">Строк дії договору</Label>
            </div>
            <p className="text-base font-medium">{contractTermText}</p>
          </div>
          
          {/* Counterparty */}
          <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-rose-600" />
              <Label className="text-sm text-gray-600">Контрагент</Label>
            </div>
            <p className="text-lg font-semibold">{contract.counterparty_name}</p>
            <p className="text-sm text-gray-600 mt-1">ЄДРПОУ: {contract.counterparty_edrpou}</p>
          </div>

          {/* Based on Order */}
          {contract.based_on_order && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-700">
                Створено на основі замовлення <strong>№{contract.based_on_order}</strong>
              </span>
            </div>
          )}

          {/* Edit Mode or View Mode */}
          {isEditing ? (
            /* EDIT MODE */
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Режим редагування
              </h3>
              
              {/* Subject */}
              <div className="space-y-2">
                <Label>Предмет договору</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                  placeholder="Предмет договору"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Сума договору (грн)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              {/* Contract Type */}
              <div className="space-y-2">
                <Label>Тип договору</Label>
                <Select value={editForm.contract_type} onValueChange={(v) => setEditForm({...editForm, contract_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Оберіть тип" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goods">Поставка товарів</SelectItem>
                    <SelectItem value="services">Надання послуг</SelectItem>
                    <SelectItem value="goods_and_services">Поставка товарів та надання послуг</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Execution Form */}
              <div className="space-y-2">
                <Label>Формат виконання</Label>
                <Select value={editForm.execution_form} onValueChange={(v) => setEditForm({...editForm, execution_form: v})}>
                  <SelectTrigger><SelectValue placeholder="Оберіть формат" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Разова поставка / послуга</SelectItem>
                    <SelectItem value="periodic">Періодичне виконання</SelectItem>
                    <SelectItem value="with_specifications">З окремими специфікаціями</SelectItem>
                    <SelectItem value="annual_volume">В межах річного/квартального обсягу</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2">
                <Label>Адреса доставки</Label>
                <Input
                  value={editForm.delivery_address}
                  onChange={(e) => setEditForm({...editForm, delivery_address: e.target.value})}
                  placeholder="Адреса доставки"
                />
              </div>

              {/* Warranty, Penalty, Signing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Гарантія</Label>
                  <Select value={editForm.warranty_period} onValueChange={(v) => setEditForm({...editForm, warranty_period: v})}>
                    <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12_months">12 місяців</SelectItem>
                      <SelectItem value="24_months">24 місяці</SelectItem>
                      <SelectItem value="36_months">36 місяців</SelectItem>
                      <SelectItem value="not_applicable">Не передбачено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Пеня</Label>
                  <Select value={editForm.penalty_rate} onValueChange={(v) => setEditForm({...editForm, penalty_rate: v})}>
                    <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0,01% на день</SelectItem>
                      <SelectItem value="0.05">0,05% на день</SelectItem>
                      <SelectItem value="0.1">0,1% на день</SelectItem>
                      <SelectItem value="0.5">0,5% на день</SelectItem>
                      <SelectItem value="1.0">1,0% на день</SelectItem>
                      <SelectItem value="not_applicable">Не передбачено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Підписання</Label>
                  <Select value={editForm.signing_format} onValueChange={(v) => setEditForm({...editForm, signing_format: v})}>
                    <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paper">Паперовий</SelectItem>
                      <SelectItem value="electronic">Електронний (КЕП)</SelectItem>
                      <SelectItem value="both">Обидва варіанти</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.specification_required}
                    onChange={(e) => setEditForm({...editForm, specification_required: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Специфікація обов'язкова</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.quantity_variation_allowed}
                    onChange={(e) => setEditForm({...editForm, quantity_variation_allowed: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Варіативність обсягу</span>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE */
            <>
              {/* Contract Type & Execution Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-rose-600" />
                    <Label className="text-xs text-gray-500 uppercase">Тип договору</Label>
                  </div>
                  <p className="text-base font-medium">{contractTypeLabel}</p>
                </div>
                {executionFormLabel && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Settings className="w-4 h-4 text-rose-600" />
                      <Label className="text-xs text-gray-500 uppercase">Формат виконання</Label>
                    </div>
                    <p className="text-base font-medium">{executionFormLabel}</p>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <Label className="text-xs text-gray-500 uppercase">Предмет договору</Label>
                </div>
                <p className="text-base">{contract.subject}</p>
              </div>

              {/* Delivery Address */}
              {contract.delivery_address && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <Label className="text-xs text-gray-500 uppercase">Адреса доставки</Label>
                  </div>
                  <p className="text-base font-medium">{contract.delivery_address}</p>
                </div>
              )}

              {/* Contract Details Grid */}
              <div className="grid grid-cols-3 gap-4">
                {warrantyPeriodLabel && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-green-600" />
                      <Label className="text-xs text-gray-500 uppercase">Гарантія</Label>
                    </div>
                    <p className="text-base font-medium text-green-700">{warrantyPeriodLabel}</p>
                  </div>
                )}
                {penaltyRateLabel && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <Label className="text-xs text-gray-500 uppercase">Пеня</Label>
                    </div>
                    <p className="text-base font-medium text-orange-700">{penaltyRateLabel}</p>
                  </div>
                )}
                {signingFormatLabel && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <Label className="text-xs text-gray-500 uppercase">Підписання</Label>
                    </div>
                    <p className="text-base font-medium text-purple-700">{signingFormatLabel}</p>
                  </div>
                )}
              </div>

              {/* Additional Options */}
              {(contract.specification_required || contract.quantity_variation_allowed) && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Додаткові умови</Label>
                  <div className="space-y-2">
                    {contract.specification_required && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Специфікація обов'язкова</span>
                      </div>
                    )}
                    {contract.quantity_variation_allowed && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Варіативність обсягу</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <Label className="text-xs text-gray-500 uppercase">Умови оплати</Label>
                </div>
                <p className="text-sm">Оплата здійснюється протягом 10 (десяти) календарних днів після дати постачання/підписання акту приймання-передачі.</p>
              </div>
            </>
          )}

          {/* Amount */}
          <div className="bg-rose-100 p-4 rounded-lg border-2 border-rose-300">
            <Label className="text-xs text-gray-600 uppercase">Загальна сума договору</Label>
            <p className="text-3xl font-bold text-rose-700">{(isEditing ? editForm.amount : contract.amount)?.toFixed(2) || '0.00'} грн</p>
          </div>

          {/* Status Change */}
          {onStatusChange && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <Label className="text-xs text-gray-500 uppercase mb-2 block">Змінити статус договору</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={contract.status === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStatusChange(contract.number, key)}
                    className={contract.status === key ? 'bg-rose-600 text-white' : ''}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Create Related Documents */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <Label className="text-xs text-indigo-700 uppercase mb-3 block flex items-center gap-2">
              <Plus className="w-4 h-4" /> Створити документ на основі договору
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {onCreateInvoice && (
                <Button 
                  variant="outline" 
                  onClick={() => onCreateInvoice(contract)}
                  className="flex items-center gap-2 border-green-300 hover:bg-green-50"
                >
                  <Receipt className="w-4 h-4 text-green-600" />
                  <span>Рахунок</span>
                </Button>
              )}
              {onCreateAct && (
                <Button 
                  variant="outline"
                  onClick={() => onCreateAct(contract)}
                  className="flex items-center gap-2 border-amber-300 hover:bg-amber-50"
                >
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <span>Акт</span>
                </Button>
              )}
              {onCreateWaybill && (
                <Button 
                  variant="outline"
                  onClick={() => onCreateWaybill(contract)}
                  className="flex items-center gap-2 border-purple-300 hover:bg-purple-50"
                >
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Накладна</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Main Actions */}
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

          {/* Quick Actions */}
          <div className="flex gap-2 justify-center">
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Друк
            </Button>
            <Button variant="ghost" size="sm" onClick={onViewPDF}>
              <Download className="w-4 h-4 mr-1" /> Завантажити PDF
            </Button>
          </div>
        </div>
          
        {/* Comments Section */}
        <div className="mt-6 pt-6 border-t">
          <CommentsSection entityType="contract" entityId={contract.number} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDialog;
