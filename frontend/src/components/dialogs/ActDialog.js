import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, Mail, Edit, Trash2 } from 'lucide-react';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] lg:max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-purple-700">Акт №{act.number}</DialogTitle>
          <DialogDescription>{act.counterparty_name}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Номер акта</Label>
              <p className="text-lg font-semibold">№{act.number}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Дата</Label>
              <p className="text-lg font-semibold">{formatDateUkrainian(act.date)}</p>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Контрагент</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-gray-600">ЄДРПОУ</Label>
                <p className="font-medium">{act.counterparty_edrpou}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Назва</Label>
                <p className="font-medium">{act.counterparty_name}</p>
              </div>
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
                  {act.items?.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 text-center">{item.unit}</td>
                      <td className="p-2 text-right">{item.quantity || 0}</td>
                      <td className="p-2 text-right">{(item.price || 0).toFixed(2)} грн</td>
                      <td className="p-2 text-right font-semibold">{(item.amount || 0).toFixed(2)} грн</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-lg font-bold text-purple-900">Всього: {(act.total_amount || 0).toFixed(2)} грн</p>
              </div>
            </div>
          </div>
        </div>
          
          {/* Comments Section */}
          <CommentsSection entityType="act" entityId={act.number} />
        
        <DialogFooter className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={onSendEmail}
            disabled={loading}
            className={`border-2 ${theme.border} ${theme.hover} ${theme.textLight} hover:scale-105 transition-all duration-300`}
          >
            <Mail className="w-4 h-4 mr-2" /> Email
          </Button>
          <Button 
            onClick={onViewPDF}
            disabled={loading}
            className={`${theme.buttonBg} ${theme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
          >
            <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
          </Button>
          {onEdit && (
            <Button 
              variant="outline"
              onClick={() => onEdit(act)}
              disabled={loading}
              className={`border-2 ${theme.border} ${theme.hover} ${theme.textLight} hover:scale-105 transition-all duration-300`}
            >
              <Edit className="w-4 h-4 mr-2" /> Редагувати
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={loading}
            className="hover:scale-105 transition-all duration-300"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Видалити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActDialog;
