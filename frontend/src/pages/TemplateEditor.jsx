import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Save, 
  ArrowLeft, 
  RotateCcw, 
  History, 
  Code, 
  Eye,
  Loader2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TEMPLATE_TYPES = [
  { value: 'invoice', label: 'Рахунок' },
  { value: 'act', label: 'Акт' },
  { value: 'waybill', label: 'Накладна' },
  { value: 'order', label: 'Замовлення' },
  { value: 'contract', label: 'Договір' },
];

// Common variables for all document types
const COMMON_VARIABLES = [
  { name: 'supplier_name', description: 'Назва постачальника' },
  { name: 'supplier_edrpou', description: 'ЄДРПОУ постачальника' },
  { name: 'supplier_address', description: 'Адреса постачальника' },
  { name: 'supplier_iban', description: 'IBAN постачальника' },
  { name: 'supplier_bank', description: 'Банк постачальника' },
  { name: 'buyer_name', description: 'Назва покупця' },
  { name: 'buyer_edrpou', description: 'ЄДРПОУ покупця' },
  { name: 'buyer_address', description: 'Адреса покупця' },
  { name: 'buyer_iban', description: 'IBAN покупця' },
  { name: 'document_number', description: 'Номер документа' },
  { name: 'document_date', description: 'Дата документа' },
  { name: 'total_amount', description: 'Загальна сума' },
  { name: 'items', description: 'Список товарів/робіт (цикл)' },
  { name: 'item.name', description: 'Назва товару/роботи' },
  { name: 'item.unit', description: 'Одиниця виміру' },
  { name: 'item.quantity', description: 'Кількість' },
  { name: 'item.price', description: 'Ціна' },
  { name: 'item.amount', description: 'Сума' },
];

const TemplateEditor = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateType, setTemplateType] = useState('invoice');
  const [templateName, setTemplateName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, [templateType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/templates/type/${templateType}`);
      setTemplates(response.data);
      
      // Auto-select first template if available
      if (response.data.length > 0 && !selectedTemplate) {
        selectTemplate(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Помилка завантаження шаблонів');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setEditorContent(template.content);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Введіть назву шаблону');
      return;
    }

    if (!editorContent.trim()) {
      toast.error('Введіть вміст шаблону');
      return;
    }

    setSaving(true);

    try {
      if (selectedTemplate && !selectedTemplate.is_default) {
        // Update existing template
        await axios.put(`${API_URL}/api/templates/${selectedTemplate._id}`, {
          name: templateName,
          content: editorContent,
          comment: `Оновлено ${new Date().toLocaleString('uk-UA')}`,
        });
        toast.success('Шаблон успішно оновлено');
      } else {
        // Create new template
        const response = await axios.post(`${API_URL}/api/templates`, {
          template_type: templateType,
          name: templateName,
          content: editorContent,
        });
        toast.success('Шаблон успішно створено');
        setSelectedTemplate(response.data);
      }

      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Помилка збереження шаблону');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertVersion = async (versionNumber) => {
    if (!selectedTemplate) return;

    try {
      await axios.post(`${API_URL}/api/templates/${selectedTemplate._id}/revert`, {
        version_number: versionNumber,
      });
      toast.success(`Повернуто до версії ${versionNumber}`);
      await loadTemplates();
    } catch (error) {
      console.error('Error reverting template:', error);
      toast.error('Помилка повернення до попередньої версії');
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedTemplate || selectedTemplate.is_default) return;

    if (!window.confirm('Ви впевнені, що хочете скинути шаблон до системного за замовчуванням?')) {
      return;
    }

    try {
      await axios.post(`${API_URL}/api/templates/${selectedTemplate._id}/reset`);
      toast.success('Шаблон скинуто до системного');
      await loadTemplates();
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Помилка скидання шаблону');
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setTemplateName(`Новий шаблон ${templateType}`);
    setEditorContent(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{document_number}}</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 20px; }
        .content { margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Документ №{{document_number}}</h1>
        <p>Дата: {{document_date}}</p>
    </div>
    <div class="content">
        <p><strong>Постачальник:</strong> {{supplier_name}}</p>
        <p><strong>Покупець:</strong> {{buyer_name}}</p>
        
        <table>
            <thead>
                <tr>
                    <th>Назва</th>
                    <th>Од.</th>
                    <th>Кількість</th>
                    <th>Ціна</th>
                    <th>Сума</th>
                </tr>
            </thead>
            <tbody>
                {{#each items}}
                <tr>
                    <td>{{name}}</td>
                    <td>{{unit}}</td>
                    <td>{{quantity}}</td>
                    <td>{{price}}</td>
                    <td>{{amount}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        
        <p><strong>Всього:</strong> {{total_amount}} грн</p>
    </div>
</body>
</html>`);
  };

  const insertVariable = (varName) => {
    const cursorPosition = editorContent.length;
    const newContent = editorContent + `{{${varName}}}`;
    setEditorContent(newContent);
    toast.success(`Змінну {{${varName}}} додано`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold">Редактор Шаблонів</h1>
          </div>
          <div className="flex gap-2">
            {selectedTemplate && !selectedTemplate.is_default && (
              <>
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  disabled={saving}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Скинути на дефолт
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={handleCreateNew}
              disabled={saving}
            >
              <Code className="w-4 h-4 mr-2" />
              Новий шаблон
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Збереження...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Зберегти
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Template Selection & Variables */}
          <div className="space-y-4">
            {/* Template Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Тип документа</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Template List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Шаблони</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-sm text-gray-500">Завантаження...</p>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-gray-500">Немає шаблонів</p>
                  ) : (
                    templates.map((template) => (
                      <Button
                        key={template._id}
                        variant={selectedTemplate?._id === template._id ? 'default' : 'outline'}
                        className="w-full justify-start text-left"
                        onClick={() => selectTemplate(template)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{template.name}</span>
                          {template.is_default && (
                            <span className="text-xs text-gray-500">Системний</span>
                          )}
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Змінні</CardTitle>
                <CardDescription>Натисніть щоб вставити</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {COMMON_VARIABLES.map((variable) => (
                    <Button
                      key={variable.name}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => insertVariable(variable.name)}
                    >
                      <div className="flex flex-col items-start">
                        <code className="text-xs font-mono text-teal-600">
                          {`{{${variable.name}}}`}
                        </code>
                        <span className="text-xs text-gray-500">
                          {variable.description}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Editor Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Template Name */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Назва шаблону</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Назва шаблону"
                    disabled={selectedTemplate?.is_default}
                  />
                  {selectedTemplate?.is_default && (
                    <p className="text-xs text-gray-500">
                      Системний шаблон неможливо редагувати. Створіть новий на його основі.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Editor Tabs */}
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="editor" className="gap-2">
                      <Code className="w-4 h-4" />
                      Редактор
                    </TabsTrigger>
                    {selectedTemplate && selectedTemplate.version_history?.length > 0 && (
                      <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Історія версій
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="editor" className="p-0 m-0">
                    <div className="border-t">
                      <Editor
                        height="600px"
                        defaultLanguage="html"
                        value={editorContent}
                        onChange={(value) => setEditorContent(value || '')}
                        theme="vs-light"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          readOnly: selectedTemplate?.is_default,
                          wordWrap: 'on',
                          formatOnPaste: true,
                          formatOnType: true,
                        }}
                      />
                    </div>
                  </TabsContent>
                  
                  {selectedTemplate && selectedTemplate.version_history?.length > 0 && (
                    <TabsContent value="history" className="p-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold">Історія версій (останні 3)</h3>
                        <div className="space-y-2">
                          {selectedTemplate.version_history.map((version) => (
                            <Card key={version.version_number}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Версія {version.version_number}</p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(version.created_at).toLocaleString('uk-UA')}
                                    </p>
                                    {version.comment && (
                                      <p className="text-sm text-gray-600 mt-1">{version.comment}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRevertVersion(version.version_number)}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Повернутися
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
