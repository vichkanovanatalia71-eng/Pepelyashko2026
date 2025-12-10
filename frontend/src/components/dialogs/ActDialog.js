import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, Mail, Edit, Trash2, Plus } from 'lucide-react';

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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    items: [],
    total_amount: 0
  });

  useEffect(() => {
    if (act && !editing) {
      const dateStr = act.date ? 
        (act.date.split('T')[0]) : 
        new Date().toISOString().split('T')[0];
      
      setEditForm({
        date: dateStr,
        items: act.items?.map(item => ({
          ...item,
          quantity: item.quantity || 0,
          price: item.price || 0,
          amount: item.amount || 0
        })) || [],
        total_amount: act.total_amount || 0
      });
    }
  }, [act, editing]);

  const startEditing = () => {
    if (!act) return;
    const dateStr = act.date ? 
      (act.date.split('T')[0]) : 
      new Date().toISOString().split('T')[0];
    
    setEditForm({
      date: dateStr,
      items: act.items.map(item => ({
        ...item,
        quantity: item.quantity || 0,
        price: item.price || 0,
        amount: item.amount || 0
      })),
      total_amount: act.total_amount || 0
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...editForm.items];
    updatedItems[index][field] = value;
    
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].amount = quantity * price;
    }
    
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditForm({
      ...editForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const addItem = () => {
    setEditForm({
      ...editForm,
      items: [...editForm.items, { name: '', unit: 'шт', quantity: 1, price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    const updatedItems = editForm.items.filter((_, i) => i !== index);
    const total = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setEditForm({
      ...editForm,
      items: updatedItems,
      total_amount: total
    });
  };

  const handleSave = () => {
    onEdit(editForm);
    setEditing(false);
  };

  if (!act) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-purple-700">Акт №{act.number}</DialogTitle>
          <DialogDescription>{act.counterparty_name}</DialogDescription>
        </DialogHeader>
        
        {!editing && (
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
        )}

        {editing && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Номер акта</Label>
                <Input value={act.number} disabled className="bg-gray-100" />
              </div>
              <div>
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Контрагент (не редагується)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">ЄДРПОУ</Label>
                  <Input value={act.counterparty_edrpou} disabled className="bg-white" />
                </div>
                <div>
                  <Label className="text-sm">Назва</Label>
                  <Input value={act.counterparty_name} disabled className="bg-white" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Виконані роботи</h3>
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Додати
                </Button>
              </div>
              
              {editForm.items.map((item, index) => (
                <Card key={index} className="p-4 mb-3">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">Найменування</Label>
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
                        value={(item.amount || 0).toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  {editForm.items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Видалити
                    </Button>
                  )}
                </Card>
              ))}

              <div className="bg-purple-50 p-4 rounded border border-purple-200 mt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Загальна сума:</span>
                  <span className="text-xl font-bold text-purple-700">
                    {(editForm.total_amount || 0).toFixed(2)} грн
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex gap-2 justify-end">
          {!editing && (
            <>
              <Button 
                variant="outline" 
                onClick={onSendEmail}
                className={`border-2 ${theme.border} ${theme.hover} ${theme.textLight} hover:scale-105 transition-all duration-300`}
              >
                <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
              <Button 
                onClick={onViewPDF}
                className={`${theme.buttonBg} ${theme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <Eye className="w-4 h-4 mr-2" /> Переглянути PDF
              </Button>
              <Button variant="outline" onClick={startEditing}>
                <Edit className="w-4 h-4 mr-2" /> Редагувати
              </Button>
              <Button variant="destructive" onClick={onDelete} className="hover:scale-105 transition-all duration-300">
                <Trash2 className="w-4 h-4 mr-2" /> Видалити
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button 
                variant="outline" 
                onClick={cancelEditing}
                disabled={loading}
              >
                Скасувати
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading}
                className={`${theme.buttonBg} ${theme.buttonHover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                {loading ? 'Збереження...' : 'Зберегти зміни'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActDialog;
