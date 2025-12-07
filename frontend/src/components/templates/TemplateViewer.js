import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Code, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TemplateViewer = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'

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
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {viewMode === 'preview' ? (
                        <div className="border rounded-lg p-4 bg-white">
                          <iframe
                            srcDoc={selectedTemplate.content}
                            className="w-full h-[600px] border-0"
                            title="Template Preview"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto h-[600px]">
                          <pre className="text-xs font-mono">
                            {selectedTemplate.content}
                          </pre>
                        </div>
                      )}
                      
                      {/* Variables info */}
                      {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
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
