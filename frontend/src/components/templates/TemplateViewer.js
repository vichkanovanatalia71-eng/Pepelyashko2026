import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Code, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TemplateViewer = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/templates`);
      setTemplates(response.data);
      
      // Auto-select first template
      if (response.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Помилка завантаження шаблонів');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateTypeLabel = (type) => {
    const labels = {
      'invoice': 'Рахунок',
      'act': 'Акт',
      'waybill': 'Накладна',
      'contract': 'Договір',
      'order': 'Замовлення'
    };
    return labels[type] || type;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(selectedTemplate.content);
    setViewMode('code');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !editedContent.trim()) {
      toast.error('Шаблон не може бути порожнім');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/templates/${selectedTemplate._id}`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно оновлено!');
      setIsEditing(false);
      
      // Reload templates
      await loadTemplates();
      
      // Re-select updated template
      const updated = templates.find(t => t._id === selectedTemplate._id);
      if (updated) {
        setSelectedTemplate({...updated, content: editedContent});
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження шаблону');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedTemplate) {
      return;
    }

    // Confirm action
    if (!window.confirm('Ви впевнені, що хочете скинути шаблон на системний за замовчуванням? Поточний вміст буде збережено в історії версій.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/templates/${selectedTemplate._id}/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно скинуто на системний!');
      
      // Reload templates
      await loadTemplates();
      
      // Update selected template with new content
      setSelectedTemplate(response.data);
      setIsEditing(false);
      setViewMode('preview');
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error(error.response?.data?.detail || 'Помилка скидання шаблону');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Шаблони документів</CardTitle>
          <CardDescription>
            Перегляд та управління шаблонами для генерації PDF документів
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Завантаження...</div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Template list */}
              <div className="col-span-3">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template._id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?._id === template._id
                          ? 'border-blue-500 border-2 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-gray-500">
                              {getTemplateTypeLabel(template.template_type)}
                            </p>
                            {template.is_default && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-1 inline-block">
                                За замовчуванням
                              </span>
                            )}
                          </div>
                          <FileText className="w-4 h-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Template preview/editor */}
              <div className="col-span-9">
                {selectedTemplate ? (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{selectedTemplate.name}</CardTitle>
                          <CardDescription>
                            Тип: {getTemplateTypeLabel(selectedTemplate.template_type)} | 
                            Версія: {selectedTemplate.current_version}
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
                            srcDoc={selectedTemplate.content}
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
                            {selectedTemplate.content}
                          </pre>
                        </div>
                      )}
                      
                      {/* Variables info - ПОВНИЙ СПИСОК */}
                      {selectedTemplate.template_type === 'invoice' && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-bold mb-3 text-blue-900">📋 Доступні змінні для рахунку:</h4>
                          
                          <div className="space-y-4 text-sm">
                            {/* Document info */}
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Документ:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{document_number}}'}</code>
                                <span className="text-xs text-gray-600">- Номер рахунку</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{document_date}}'}</code>
                                <span className="text-xs text-gray-600">- Дата (DD.MM.YYYY)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{document_date_text}}'}</code>
                                <span className="text-xs text-gray-600">- Дата прописом (08 грудня 2025 року)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{items_table}}'}</code>
                                <span className="text-xs text-gray-600">- Таблиця товарів (HTML)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{based_on_order}}'}</code>
                                <span className="text-xs text-gray-600">- Підстава (Замовлення №)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{based_on_document}}'}</code>
                                <span className="text-xs text-gray-600">- Підстава (альтернатива)</span>
                              </div>
                            </div>

                            {/* Amounts */}
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Суми:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{total_amount}}'}</code>
                                <span className="text-xs text-gray-600">- Загальна сума (число)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{total_amount_text}}'}</code>
                                <span className="text-xs text-gray-600">- Сума прописом</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{amount_without_vat}}'}</code>
                                <span className="text-xs text-gray-600">- Сума без ПДВ</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{vat_amount}}'}</code>
                                <span className="text-xs text-gray-600">- Сума ПДВ</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{vat_rate}}'}</code>
                                <span className="text-xs text-gray-600">- Ставка ПДВ (%)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{is_vat_payer}}'}</code>
                                <span className="text-xs text-gray-600">- Чи платник ПДВ (true/false)</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{vat_note}}'}</code>
                                <span className="text-xs text-gray-600">- Примітка про ПДВ</span>
                              </div>
                            </div>

                            {/* Supplier */}
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Постачальник:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_name}}'}</code>
                                <span className="text-xs text-gray-600">- Назва</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_company_name}}'}</code>
                                <span className="text-xs text-gray-600">- Назва компанії</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_edrpou}}'}</code>
                                <span className="text-xs text-gray-600">- ЄДРПОУ</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_address}}'}</code>
                                <span className="text-xs text-gray-600">- Адреса</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_email}}'}</code>
                                <span className="text-xs text-gray-600">- Email</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_phone}}'}</code>
                                <span className="text-xs text-gray-600">- Телефон</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_iban}}'}</code>
                                <span className="text-xs text-gray-600">- IBAN</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_mfo}}'}</code>
                                <span className="text-xs text-gray-600">- МФО</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_bank}}'}</code>
                                <span className="text-xs text-gray-600">- Назва банку</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_full_name}}'}</code>
                                <span className="text-xs text-gray-600">- Повне ім'я</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_director_name}}'}</code>
                                <span className="text-xs text-gray-600">- ПІБ директора</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_director_position}}'}</code>
                                <span className="text-xs text-gray-600">- Посада директора</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_position}}'}</code>
                                <span className="text-xs text-gray-600">- Посада</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_represented_by}}'}</code>
                                <span className="text-xs text-gray-600">- В особі</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_signature}}'}</code>
                                <span className="text-xs text-gray-600">- Підпис</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_contract_type}}'}</code>
                                <span className="text-xs text-gray-600">- Діє на підставі</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{supplier_logo}}'}</code>
                                <span className="text-xs text-gray-600">- Логотип (URL)</span>
                              </div>
                            </div>

                            {/* Buyer/Counterparty */}
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Покупець (можна використовувати buyer_ або counterparty_):</p>
                              <div className="grid grid-cols-2 gap-2">
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_name}}'}</code>
                                <span className="text-xs text-gray-600">- Назва</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_edrpou}}'}</code>
                                <span className="text-xs text-gray-600">- ЄДРПОУ</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_address}}'}</code>
                                <span className="text-xs text-gray-600">- Адреса</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_email}}'}</code>
                                <span className="text-xs text-gray-600">- Email</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_phone}}'}</code>
                                <span className="text-xs text-gray-600">- Телефон</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_iban}}'}</code>
                                <span className="text-xs text-gray-600">- IBAN</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_mfo}}'}</code>
                                <span className="text-xs text-gray-600">- МФО</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_bank}}'}</code>
                                <span className="text-xs text-gray-600">- Назва банку</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_director_name}}'}</code>
                                <span className="text-xs text-gray-600">- ПІБ директора</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_director_position}}'}</code>
                                <span className="text-xs text-gray-600">- Посада директора</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_position}}'}</code>
                                <span className="text-xs text-gray-600">- Посада</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_represented_by}}'}</code>
                                <span className="text-xs text-gray-600">- В особі</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{buyer_signature}}'}</code>
                                <span className="text-xs text-gray-600">- Підпис</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">{'{{counterparty_contract_type}}'}</code>
                                <span className="text-xs text-gray-600">- Тип договору</span>
                              </div>
                            </div>

                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-800">
                                💡 <strong>Підказка:</strong> Використовуйте <code>{'{{#if variable}}'}</code>...<code>{'{{/if}}'}</code> для умовного відображення
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* For other template types - show simple list */}
                      {selectedTemplate.template_type !== 'invoice' && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold mb-2">Доступні змінні:</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTemplate.variables.map((variable, idx) => (
                              <code
                                key={idx}
                                className="bg-white px-2 py-1 rounded text-xs border"
                              >
                                {`{{${variable}}}`}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    Оберіть шаблон для перегляду
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateViewer;
