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
  Plus, Building2, BadgeCheck, XCircle, Clipboard, FileSignature
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

  useEffect(() => {
    if (contract) {
      setEditForm({
        date: contract.date?.split('T')[0] || '',
        subject: contract.subject || '',
        amount: contract.amount || "",
        contract_type: contract.contract_type || 'goods',
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

  const statusLabel = CONTRACT_STATUS_LABELS[contract.status] || 'Активний';
  const statusColor = CONTRACT_STATUS_COLORS[contract.status] || CONTRACT_STATUS_COLORS.active;
  const contractTypeLabel = CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type;
  const executionFormLabel = EXECUTION_FORM_LABELS[contract.execution_form] || '';
  const warrantyPeriodLabel = WARRANTY_PERIOD_LABELS[contract.warranty_period] || '';
  const penaltyRateLabel = PENALTY_RATE_LABELS[contract.penalty_rate] || '';
  const signingFormatLabel = SIGNING_FORMAT_LABELS[contract.signing_format] || '';

  // Calculate contract validity
  const contractDate = new Date(contract.date);
  const endOfYear = new Date(contractDate.getFullYear(), 11, 31);
  const today = new Date();
  const daysRemaining = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  const contractTermText = `з ${formatDateUkrainian(contract.date)} до 31 грудня ${contractDate.getFullYear()} року`;

  const copyContractNumber = () => {
    navigator.clipboard.writeText(contract.number);
    toast.success('Номер договору скопійовано');
  };

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(contract._id, editForm);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      date: contract.date?.split('T')[0] || '',
      subject: contract.subject || '',
      amount: contract.amount || 0,
      contract_type: contract.contract_type || 'goods',
      execution_form: contract.execution_form || '',
      delivery_address: contract.delivery_address || '',
      warranty_period: contract.warranty_period || '',
      penalty_rate: contract.penalty_rate || '',
      signing_format: contract.signing_format || '',
      specification_required: contract.specification_required || false,
      quantity_variation_allowed: contract.quantity_variation_allowed || false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] p-0 bg-transparent border-none shadow-none overflow-visible max-h-[95vh]">
        <div className="bg-[#FFF5F5] p-4 rounded-[16px] max-h-[90vh] overflow-y-auto">
          <div className="bg-white rounded-[12px] relative" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
            {/* Close button */}
            <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200">
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                    <FileSignature className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-semibold text-[#1B1B1B] flex items-center gap-2">
                      Договір №{contract.number}
                      <button onClick={copyContractNumber} className="p-1 hover:bg-gray-100 rounded">
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </h1>
                    <p className="text-[12px] text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {contract.counterparty_name}
                    </p>
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

              {/* Main Content */}
              <div className="flex gap-4">
                {/* Left Column - Contract Info */}
                <div className="flex-1 min-w-[550px] space-y-3">
                  {/* Validity Status */}
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
                      <span className="text-blue-700 text-xs">{contractTermText}</span>
                    </div>
                  </div>

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Номер</p>
                      <p className="text-sm font-bold">№{contract.number}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Дата</p>
                      {isEditing ? (
                        <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="h-6 text-xs p-1" />
                      ) : (
                        <p className="text-sm font-semibold">{formatDateUkrainian(contract.date)}</p>
                      )}
                    </div>
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">ЄДРПОУ</p>
                      <p className="text-sm font-mono">{contract.counterparty_edrpou}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Тип</p>
                      {isEditing ? (
                        <Select value={editForm.contract_type} onValueChange={(v) => setEditForm({...editForm, contract_type: v})}>
                          <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goods">Товари</SelectItem>
                            <SelectItem value="services">Послуги</SelectItem>
                            <SelectItem value="goods_and_services">Товари і послуги</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium">{contractTypeLabel}</p>
                      )}
                    </div>
                    <div className="p-2 bg-rose-100 rounded text-center border border-rose-200">
                      <p className="text-[10px] text-gray-500 uppercase">Сума</p>
                      {isEditing ? (
                        <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0)})} placeholder="0.00" className="h-6 text-xs p-1" />
                      ) : (
                        <p className="text-sm font-bold text-rose-700">{contract.amount?.toFixed(2)} грн</p>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                      <Clipboard className="w-3 h-3" /> Предмет договору
                    </p>
                    {isEditing ? (
                      <Input value={editForm.subject} onChange={(e) => setEditForm({...editForm, subject: e.target.value})} className="h-7 text-sm mt-1" />
                    ) : (
                      <p className="text-sm">{contract.subject}</p>
                    )}
                  </div>

                  {/* Contract Details Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {/* Execution Form */}
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                        <Settings className="w-3 h-3" /> Формат виконання
                      </p>
                      {isEditing ? (
                        <Select value={editForm.execution_form} onValueChange={(v) => setEditForm({...editForm, execution_form: v})}>
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Оберіть" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">Разова</SelectItem>
                            <SelectItem value="periodic">Періодичне</SelectItem>
                            <SelectItem value="with_specifications">Зі специфікаціями</SelectItem>
                            <SelectItem value="annual_volume">Річний обсяг</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium">{executionFormLabel || '—'}</p>
                      )}
                    </div>

                    {/* Warranty Period */}
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-600" /> Гарантія
                      </p>
                      {isEditing ? (
                        <Select value={editForm.warranty_period} onValueChange={(v) => setEditForm({...editForm, warranty_period: v})}>
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Оберіть" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12_months">12 міс</SelectItem>
                            <SelectItem value="24_months">24 міс</SelectItem>
                            <SelectItem value="36_months">36 міс</SelectItem>
                            <SelectItem value="not_applicable">Ні</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium text-green-700">{warrantyPeriodLabel || '—'}</p>
                      )}
                    </div>

                    {/* Penalty Rate */}
                    <div className="p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-orange-600" /> Пеня
                      </p>
                      {isEditing ? (
                        <Select value={editForm.penalty_rate} onValueChange={(v) => setEditForm({...editForm, penalty_rate: v})}>
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Оберіть" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.01">0,01%</SelectItem>
                            <SelectItem value="0.05">0,05%</SelectItem>
                            <SelectItem value="0.1">0,1%</SelectItem>
                            <SelectItem value="0.5">0,5%</SelectItem>
                            <SelectItem value="1.0">1,0%</SelectItem>
                            <SelectItem value="not_applicable">Ні</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium text-orange-700">{penaltyRateLabel || '—'}</p>
                      )}
                    </div>

                    {/* Signing Format */}
                    <div className="p-2 bg-purple-50 rounded border border-purple-200">
                      <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                        <PenTool className="w-3 h-3 text-purple-600" /> Підписання
                      </p>
                      {isEditing ? (
                        <Select value={editForm.signing_format} onValueChange={(v) => setEditForm({...editForm, signing_format: v})}>
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Оберіть" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paper">Папір</SelectItem>
                            <SelectItem value="electronic">КЕП</SelectItem>
                            <SelectItem value="both">Обидва</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium text-purple-700">{signingFormatLabel || '—'}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-600" /> Адреса доставки
                    </p>
                    {isEditing ? (
                      <Input value={editForm.delivery_address} onChange={(e) => setEditForm({...editForm, delivery_address: e.target.value})} placeholder="Введіть адресу" className="h-7 text-sm mt-1" />
                    ) : (
                      <p className="text-sm">{contract.delivery_address || '—'}</p>
                    )}
                  </div>

                  {/* Additional Options */}
                  <div className="flex gap-4 p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input type="checkbox" checked={editForm.specification_required} onChange={(e) => setEditForm({...editForm, specification_required: e.target.checked})} className="h-4 w-4 rounded" />
                      ) : (
                        contract.specification_required ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-xs">Специфікація обов'язкова</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input type="checkbox" checked={editForm.quantity_variation_allowed} onChange={(e) => setEditForm({...editForm, quantity_variation_allowed: e.target.checked})} className="h-4 w-4 rounded" />
                      ) : (
                        contract.quantity_variation_allowed ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-xs">Варіативність обсягу</span>
                    </div>
                  </div>

                  {/* Based on Order */}
                  {contract.based_on_order && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span className="text-indigo-700">На основі замовлення <strong>№{contract.based_on_order}</strong></span>
                    </div>
                  )}
                </div>

                {/* Right Column - Actions */}
                <div className="w-[300px] space-y-3">
                  {/* Status Change */}
                  {onStatusChange && (
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-[10px] text-gray-500 uppercase mb-2">Статус договору</p>
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

                  {/* Comments */}
                  <div className="border rounded-lg p-2 max-h-[180px] overflow-y-auto">
                    <CommentsSection entityType="contract" entityId={contract.number} compact />
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

export default ContractDialog;
