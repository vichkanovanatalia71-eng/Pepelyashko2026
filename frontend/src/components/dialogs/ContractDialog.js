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
        date: contract.date ? contract.date.split('T')[0] : '',
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
      date: contract.date ? contract.date.split('T')[0] : '',
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
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] max-h-[90vh] overflow-hidden p-0">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-xl text-rose-700 flex items-center gap-2">
                Договір №{contract.number}
                <button onClick={copyContractNumber} className="p-1 hover:bg-rose-100 rounded">
                  <Copy className="w-3 h-3 text-gray-400" />
                </button>
              </DialogTitle>
              <DialogDescription className="text-sm flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {contract.counterparty_name}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
              {statusLabel}
            </span>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8">
                <Pencil className="w-3 h-3 mr-1" /> Редагувати
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handleCancel} className="h-8">
                  <X className="w-3 h-3 mr-1" /> Скасувати
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white h-8">
                  <Save className="w-3 h-3 mr-1" /> Зберегти
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content - Horizontal Layout */}
        <div className="flex gap-4 p-4 overflow-auto max-h-[calc(90vh-140px)]">
          {/* Left Column - Main Info */}
          <div className="flex-1 min-w-[400px] space-y-3">
            {/* Validity + Term Row */}
            <div className="flex gap-2">
              {!isExpired ? (
                <div className="flex-1 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <BadgeCheck className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">Дійсний</span>
                  <span className="text-green-600 text-xs">• {daysRemaining} днів</span>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 font-medium">Термін закінчився</span>
                </div>
              )}
              <div className="flex-1 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700">{contractTermText}</span>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-[10px] text-gray-500 uppercase">Номер</p>
                <p className="text-sm font-bold">№{contract.number}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-[10px] text-gray-500 uppercase">Дата</p>
                <p className="text-sm font-semibold">{formatDateUkrainian(contract.date)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-[10px] text-gray-500 uppercase">ЄДРПОУ</p>
                <p className="text-sm font-mono">{contract.counterparty_edrpou}</p>
              </div>
              <div className="p-2 bg-rose-100 rounded text-center border border-rose-200">
                <p className="text-[10px] text-gray-500 uppercase">Сума</p>
                <p className="text-sm font-bold text-rose-700">{(isEditing ? editForm.amount : contract.amount)?.toFixed(2)} грн</p>
              </div>
            </div>

            {isEditing ? (
              /* EDIT MODE - Compact */
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                <h3 className="font-semibold text-yellow-800 text-sm flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Редагування
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Дата</Label>
                    <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Сума (грн)</Label>
                    <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})} className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Предмет договору</Label>
                  <Input value={editForm.subject} onChange={(e) => setEditForm({...editForm, subject: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Тип</Label>
                    <Select value={editForm.contract_type} onValueChange={(v) => setEditForm({...editForm, contract_type: v})}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="goods">Товари</SelectItem>
                        <SelectItem value="services">Послуги</SelectItem>
                        <SelectItem value="goods_and_services">Товари і послуги</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Гарантія</Label>
                    <Select value={editForm.warranty_period} onValueChange={(v) => setEditForm({...editForm, warranty_period: v})}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12_months">12 міс</SelectItem>
                        <SelectItem value="24_months">24 міс</SelectItem>
                        <SelectItem value="36_months">36 міс</SelectItem>
                        <SelectItem value="not_applicable">Ні</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Підпис</Label>
                    <Select value={editForm.signing_format} onValueChange={(v) => setEditForm({...editForm, signing_format: v})}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paper">Папір</SelectItem>
                        <SelectItem value="electronic">КЕП</SelectItem>
                        <SelectItem value="both">Обидва</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW MODE - Compact */
              <>
                {/* Subject */}
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Предмет договору
                  </p>
                  <p className="text-sm">{contract.subject}</p>
                </div>

                {/* Contract Details Row */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Тип</p>
                    <p className="text-xs font-medium">{contractTypeLabel}</p>
                  </div>
                  {executionFormLabel && (
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Формат</p>
                      <p className="text-xs font-medium">{executionFormLabel}</p>
                    </div>
                  )}
                  {warrantyPeriodLabel && (
                    <div className="p-2 bg-green-50 rounded text-center border border-green-200">
                      <p className="text-[10px] text-gray-500 uppercase">Гарантія</p>
                      <p className="text-xs font-medium text-green-700">{warrantyPeriodLabel}</p>
                    </div>
                  )}
                  {penaltyRateLabel && (
                    <div className="p-2 bg-orange-50 rounded text-center border border-orange-200">
                      <p className="text-[10px] text-gray-500 uppercase">Пеня</p>
                      <p className="text-xs font-medium text-orange-700">{penaltyRateLabel}</p>
                    </div>
                  )}
                  {signingFormatLabel && (
                    <div className="p-2 bg-purple-50 rounded text-center border border-purple-200">
                      <p className="text-[10px] text-gray-500 uppercase">Підпис</p>
                      <p className="text-xs font-medium text-purple-700">{signingFormatLabel}</p>
                    </div>
                  )}
                </div>

                {/* Delivery Address if exists */}
                {contract.delivery_address && (
                  <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Адреса доставки</p>
                      <p className="text-sm">{contract.delivery_address}</p>
                    </div>
                  </div>
                )}

                {/* Additional Options */}
                {(contract.specification_required || contract.quantity_variation_allowed) && (
                  <div className="flex gap-3 text-xs">
                    {contract.specification_required && (
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle className="w-3 h-3" /> Специфікація обов'язкова
                      </span>
                    )}
                    {contract.quantity_variation_allowed && (
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle className="w-3 h-3" /> Варіативність обсягу
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Based on Order */}
            {contract.based_on_order && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-indigo-700">На основі замовлення <strong>№{contract.based_on_order}</strong></span>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Status */}
          <div className="w-[320px] space-y-3">
            {/* Status Change */}
            {onStatusChange && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-[10px] text-gray-500 uppercase mb-2">Статус</p>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={contract.status === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => onStatusChange(contract.number, key)}
                      className={`h-7 text-xs ${contract.status === key ? 'bg-rose-600 text-white' : ''}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Create Documents */}
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-[10px] text-indigo-700 uppercase mb-2 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Створити документ
              </p>
              <div className="grid grid-cols-3 gap-2">
                {onCreateInvoice && (
                  <Button variant="outline" size="sm" onClick={() => onCreateInvoice(contract)} className="h-8 text-xs border-green-300 hover:bg-green-50">
                    <Receipt className="w-3 h-3 mr-1 text-green-600" /> Рахунок
                  </Button>
                )}
                {onCreateAct && (
                  <Button variant="outline" size="sm" onClick={() => onCreateAct(contract)} className="h-8 text-xs border-amber-300 hover:bg-amber-50">
                    <FileCheck className="w-3 h-3 mr-1 text-amber-600" /> Акт
                  </Button>
                )}
                {onCreateWaybill && (
                  <Button variant="outline" size="sm" onClick={() => onCreateWaybill(contract)} className="h-8 text-xs border-purple-300 hover:bg-purple-50">
                    <Truck className="w-3 h-3 mr-1 text-purple-600" /> Накладна
                  </Button>
                )}
              </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-2">
              <Button onClick={onViewPDF} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white h-9">
                <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
              </Button>
              <Button onClick={onSendEmail} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9">
                <Mail className="w-4 h-4 mr-2" /> Надіслати Email
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="flex-1 h-8">
                  <Printer className="w-3 h-3 mr-1" /> Друк
                </Button>
                <Button variant="outline" size="sm" onClick={onViewPDF} className="flex-1 h-8">
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading} className="flex-1 h-8">
                  <Trash2 className="w-3 h-3 mr-1" /> Видалити
                </Button>
              </div>
            </div>

            {/* Comments - Compact */}
            <div className="border rounded-lg p-2 max-h-[200px] overflow-y-auto">
              <CommentsSection entityType="contract" entityId={contract.number} compact />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDialog;
