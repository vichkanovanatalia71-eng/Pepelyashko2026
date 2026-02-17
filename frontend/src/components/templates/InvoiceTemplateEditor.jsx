import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Code, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const InvoiceTemplateEditor = () => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates/invoice/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplate(response.data);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Помилка завантаження шаблону');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(template.content);
    setViewMode('code');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveTemplate = async () => {
    if (!template || !editedContent.trim()) {
      toast.error('Шаблон не може бути порожнім');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/templates/${template._id}`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно оновлено!');
      setIsEditing(false);
      
      // Reload template
      await loadTemplate();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження шаблону');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!template) {
      return;
    }

    if (!window.confirm('Ви впевнені, що хочете скинути шаблон на системний за замовчуванням? Поточний вміст буде збережено в історії версій.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/templates/${template._id}/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно скинуто на системний!');
      setIsEditing(false);
      setViewMode('preview');
      
      // Reload template
      await loadTemplate();
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error(error.response?.data?.detail || 'Помилка скидання шаблону');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !template) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Завантаження шаблону...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Шаблон не знайдено</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Шаблон рахунку</CardTitle>
              <CardDescription>
                Редагуйте HTML-код шаблону для налаштування вигляду PDF документів
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant={viewMode === 'preview' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('preview')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Попередній перегляд
                  </Button>
                  <Button
                    variant={viewMode === 'code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('code')}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    HTML код
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToDefault}
                    disabled={loading}
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Шаблон системи
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Редагувати
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Скасувати
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Збереження...' : 'Зберегти'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'preview' && !isEditing ? (
            <div className="border rounded-lg p-4 bg-white">
              <iframe
                srcDoc={template.content}
                className="w-full h-[600px] border-0"
                title="Template Preview"
              />
            </div>
          ) : isEditing ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[600px] p-4 bg-gray-900 text-gray-100 font-mono text-xs rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                placeholder="Введіть HTML код шаблону..."
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Використовуйте змінні у форматі {`{{variable_name}}`} для динамічних даних
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto h-[600px]">
              <pre className="text-xs font-mono">
                {template.content}
              </pre>
            </div>
          )}
          
          {/* Variables info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Доступні змінні для шаблону рахунку:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div><code className="bg-blue-100 px-1 rounded">{`{{document_number}}`}</code> - Номер документу</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{document_date_text}}`}</code> - Дата документу</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_name}}`}</code> - Назва постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_edrpou}}`}</code> - ЄДРПОУ постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_address}}`}</code> - Адреса постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_iban}}`}</code> - IBAN постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_bank}}`}</code> - Банк постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_mfo}}`}</code> - МФО банку</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_logo}}`}</code> - Логотип постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{supplier_signature}}`}</code> - Підпис постачальника</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_name}}`}</code> - Назва покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_edrpou}}`}</code> - ЄДРПОУ покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_address}}`}</code> - Адреса покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_iban}}`}</code> - IBAN покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_bank}}`}</code> - Банк покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{buyer_mfo}}`}</code> - МФО покупця</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{items_table}}`}</code> - Таблиця товарів/послуг</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{total_amount}}`}</code> - Загальна сума</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{amount_without_vat}}`}</code> - Сума без ПДВ</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{vat_amount}}`}</code> - Сума ПДВ</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{vat_rate}}`}</code> - Ставка ПДВ</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{is_vat_payer}}`}</code> - Чи є платник ПДВ</div>
              <div><code className="bg-blue-100 px-1 rounded">{`{{total_amount_text}}`}</code> - Сума прописом</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceTemplateEditor;
