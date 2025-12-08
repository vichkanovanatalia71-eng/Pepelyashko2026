import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Code, FileText, FileText as InvoiceIcon, FileCheck, Truck, FileSignature } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TemplateEditor = () => {
  const [templates, setTemplates] = useState({});
  const [selectedType, setSelectedType] = useState('invoice');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const templateTypes = [
    { key: 'invoice', label: 'Рахунок', icon: InvoiceIcon },
    { key: 'act', label: 'Акт', icon: FileCheck },
    { key: 'waybill', label: 'Накладна', icon: Truck },
    { key: 'contract', label: 'Договір', icon: FileSignature },
  ];

  useEffect(() => {
    loadAllTemplates();
  }, []);

  const loadAllTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Group templates by type
      const grouped = {};
      response.data.forEach(template => {
        if (template.user_id || template.is_default) {
          // Store user templates, or system defaults if no user template exists
          if (!grouped[template.template_type] || template.user_id) {
            grouped[template.template_type] = template;
          }
        }
      });
      
      setTemplates(grouped);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Помилка завантаження шаблонів');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTemplate = () => {
    return templates[selectedType] || null;
  };

  const handleEdit = () => {
    const currentTemplate = getCurrentTemplate();
    if (currentTemplate) {
      setIsEditing(true);
      setEditedContent(currentTemplate.content);
      setViewMode('code');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveTemplate = async () => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate || !editedContent.trim()) {
      toast.error('Шаблон не може бути порожнім');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/templates/${currentTemplate._id}`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно оновлено!');
      setIsEditing(false);
      
      await loadAllTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження шаблону');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate) {
      return;
    }

    if (!window.confirm('Ви впевнені, що хочете скинути шаблон на системний за замовчуванням? Поточний вміст буде збережено в історії версій.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/templates/${currentTemplate._id}/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Шаблон успішно скинуто на системний!');
      setIsEditing(false);
      setViewMode('preview');
      
      await loadAllTemplates();
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error(error.response?.data?.detail || 'Помилка скидання шаблону');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateTypeLabel = (type) => {
    const typeObj = templateTypes.find(t => t.key === type);
    return typeObj ? typeObj.label : type;
  };

  const currentTemplate = getCurrentTemplate();

  if (loading && Object.keys(templates).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Завантаження шаблонів...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Шаблони документів</CardTitle>
          <CardDescription>
            Редагуйте HTML-код шаблонів для налаштування вигляду PDF документів
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={(value) => {
            setSelectedType(value);
            setIsEditing(false);
            setViewMode('preview');
          }}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {templateTypes.map(type => {
                const Icon = type.icon;
                return (
                  <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {templateTypes.map(type => (
              <TabsContent key={type.key} value={type.key} className="space-y-4">
                {currentTemplate ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{getTemplateTypeLabel(selectedType)}</h3>
                        <p className="text-sm text-gray-500">
                          Редагуйте HTML-код шаблону для налаштування PDF
                        </p>
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

                    {viewMode === 'preview' && !isEditing ? (
                      <div className="border rounded-lg p-4 bg-white">
                        <iframe
                          srcDoc={currentTemplate.content}
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
                          {currentTemplate.content}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50">
                    <div className="text-gray-500">Шаблон не знайдено</div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateEditor;
