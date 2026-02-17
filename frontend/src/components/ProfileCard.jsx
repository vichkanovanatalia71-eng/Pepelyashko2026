import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Edit, Download, Mail, Trash2, Upload, Building2, Phone, MapPin, CreditCard, User, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ProfileCard = ({ user, onUpdate, onDelete }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    representative_name: user?.representative_name || '',
    edrpou: user?.edrpou || '',
    legal_address: user?.legal_address || '',
    email: user?.email || '',
    phone: user?.phone || '',
    iban: user?.iban || user?.bank_account || '',
    bank_name: user?.bank_name || user?.bank || '',
    mfo: user?.mfo || '',
    director_name: user?.director_name || '',
    director_position: user?.director_position || '',
    contract_type: user?.contract_type || 'Статуту',
    represented_by: user?.represented_by || '',
    signature: user?.signature || '',
    vat_payer: user?.vat_payer || false,
    vat_rate: user?.vat_rate || 20
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [searchingEdrpou, setSearchingEdrpou] = useState(false);

  const companyLogo = user?.logo_url 
    ? `${API_URL}${user.logo_url}`
    : (user?.company_logo ? `${API_URL}/api/uploads/${user.company_logo.split('/').pop()}` : null);

  // YouScore ЄДРПОУ search
  const searchByEdrpou = async (edrpou) => {
    if (!edrpou || (edrpou.length !== 8 && edrpou.length !== 10)) return;
    
    setSearchingEdrpou(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/counterparties/youscore/${edrpou}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data) {
        setFormData(prev => ({
          ...prev,
          representative_name: response.data.name || prev.representative_name,
          legal_address: response.data.address || prev.legal_address
        }));
        toast.success('Дані підтягнуто з ЄДР');
      }
    } catch (error) {
      console.error('Error searching EDRPOU:', error);
      toast.error('Не вдалося знайти дані за ЄДРПОУ');
    } finally {
      setSearchingEdrpou(false);
    }
  };

  // Auto-generate "В особі" field
  const generateRepresentedBy = (directorName, position, contractType) => {
    if (!directorName || !position) return '';
    
    // Convert position to genitive case (родовий відмінок)
    let positionGenitive = position.toLowerCase();
    if (positionGenitive === 'директор') positionGenitive = 'директора';
    else if (positionGenitive === 'генеральний директор') positionGenitive = 'генерального директора';
    else if (positionGenitive === 'керівник') positionGenitive = 'керівника';
    else if (positionGenitive === 'президент') positionGenitive = 'президента';
    else if (positionGenitive === 'голова') positionGenitive = 'голови';
    
    // Convert name to genitive case (українська мова)
    const nameParts = directorName.trim().split(' ');
    let nameGenitive = directorName;
    
    if (nameParts.length >= 2) {
      let lastName = nameParts[0];
      let firstName = nameParts[1];
      let patronymic = nameParts.length >= 3 ? nameParts[2] : '';
      
      // Прізвище в родовому відмінку
      if (lastName.endsWith('ко')) {
        // Українські прізвища на -ко не змінюються
        // залишаємо як є
      } else if (lastName.endsWith('ський') || lastName.endsWith('цький')) {
        lastName = lastName.slice(0, -2) + 'ого';
      } else if (lastName.endsWith('ий') || lastName.endsWith('ій')) {
        lastName = lastName.slice(0, -2) + 'ого';
      } else if (lastName.endsWith('ов') || lastName.endsWith('ев') || lastName.endsWith('їв') || lastName.endsWith('ін')) {
        lastName = lastName + 'а';
      } else if (lastName.endsWith('а') && lastName.length > 2) {
        lastName = lastName.slice(0, -1) + 'и';
      } else if (lastName.endsWith('я') && lastName.length > 2) {
        lastName = lastName.slice(0, -1) + 'і';
      } else if (!lastName.endsWith('а') && !lastName.endsWith('о') && !lastName.endsWith('е')) {
        lastName = lastName + 'а';
      }
      
      // Ім'я в родовому відмінку
      if (firstName.endsWith('о')) {
        // Ім'я на -о не змінюється
      } else if (firstName.endsWith('й')) {
        firstName = firstName.slice(0, -1) + 'я';
      } else if (firstName.endsWith('а')) {
        firstName = firstName.slice(0, -1) + 'и';
      } else {
        firstName = firstName + 'а';
      }
      
      // По батькові в родовому відмінку
      if (patronymic) {
        if (patronymic.endsWith('ович') || patronymic.endsWith('евич')) {
          patronymic = patronymic + 'а';
        } else if (patronymic.endsWith('івна') || patronymic.endsWith('ївна')) {
          patronymic = patronymic.slice(0, -1) + 'и';
        } else if (patronymic.endsWith('ч')) {
          patronymic = patronymic + 'а';
        }
      }
      
      nameGenitive = patronymic 
        ? `${lastName} ${firstName} ${patronymic}`
        : `${lastName} ${firstName}`;
    }
    
    return `${positionGenitive} ${nameGenitive}, що діє на підставі ${contractType}`;
  };

  // Auto-generate signature from director name
  const generateSignature = (directorName) => {
    if (!directorName) return '';
    
    const nameParts = directorName.trim().split(' ');
    if (nameParts.length >= 2) {
      const lastName = nameParts[0].toUpperCase();
      const firstName = nameParts[1];
      return `${firstName} ${lastName}`;
    }
    return directorName;
  };

  // Handle director name change with auto-generation
  const handleDirectorNameChange = (value) => {
    setFormData(prev => {
      const newSignature = generateSignature(value);
      const newRepresentedBy = generateRepresentedBy(value, prev.director_position, prev.contract_type);
      return {
        ...prev,
        director_name: value,
        signature: newSignature,
        represented_by: newRepresentedBy
      };
    });
  };

  // Handle position change with auto-generation
  const handlePositionChange = (value) => {
    setFormData(prev => {
      const newRepresentedBy = generateRepresentedBy(prev.director_name, value, prev.contract_type);
      return {
        ...prev,
        director_position: value,
        represented_by: newRepresentedBy
      };
    });
  };

  // Handle contract type change with auto-generation
  const handleContractTypeChange = (value) => {
    setFormData(prev => {
      const newRepresentedBy = generateRepresentedBy(prev.director_name, prev.director_position, value);
      return {
        ...prev,
        contract_type: value,
        represented_by: newRepresentedBy
      };
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/auth/profile/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Профіль_${user?.representative_name || 'Компанія'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Помилка завантаження PDF');
    }
  };

  const handleSendEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/auth/profile/send-email`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Профіль надіслано на ${email}`);
      setIsEmailDialogOpen(false);
      setEmail('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Помилка відправки email');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/auth/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Профіль успішно оновлено');
      if (onUpdate) onUpdate();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Помилка оновлення профілю');
    }
  };

  const handleDeleteProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (onDelete) onDelete();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Помилка видалення профілю');
    }
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        {/* Header with Logo */}
        <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-lg shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center text-teal-500">
                  <Building2 size={32} />
                  <span className="text-xs mt-1">Лого</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <CardTitle className="text-lg font-bold">
                {user?.representative_name || user?.company_name || 'Профіль компанії'}
              </CardTitle>
              <CardDescription className="text-teal-50 text-xs mt-1">
                Картка профілю компанії
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Building2 className="text-teal-500" size={18} />
              Основна інформація
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
              <div className="col-span-2">
                <p className="text-xs text-gray-500">ЄДРПОУ</p>
                <p className="text-sm font-medium">{user?.edrpou || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> Юридична адреса
                </p>
                <p className="text-sm font-medium">{user?.legal_address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Phone className="text-teal-500" size={18} />
              Контактні дані
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Телефон</p>
                <p className="text-sm font-medium">{user?.phone || '—'}</p>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="text-teal-500" size={18} />
              Банківські реквізити
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
              <div className="col-span-2">
                <p className="text-xs text-gray-500">IBAN</p>
                <p className="text-sm font-medium font-mono">{user?.iban || user?.bank_account || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Банк</p>
                <p className="text-sm font-medium">{user?.bank_name || user?.bank || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">МФО</p>
                <p className="text-sm font-medium">{user?.mfo || '—'}</p>
              </div>
            </div>
          </div>

          {/* Management */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User className="text-teal-500" size={18} />
              Керівництво
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Директор</p>
                <p className="text-sm font-medium">{user?.director_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Посада</p>
                <p className="text-sm font-medium">{user?.director_position || user?.position || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Діє на підставі</p>
                <p className="text-sm font-medium">{user?.contract_type || 'Статуту'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Підпис</p>
                <p className="text-sm font-medium">{user?.signature || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">В особі</p>
                <p className="text-sm font-medium">{user?.represented_by || '—'}</p>
              </div>
            </div>
          </div>

          {/* VAT Information */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="text-teal-500" size={18} />
              Податкова інформація
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Податковий статус</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {user?.vat_payer ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Платник ПДВ ({user?.vat_rate || 20}%)
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        Платник ЄП
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t">
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              className="bg-teal-500 hover:bg-teal-600 text-sm py-2"
            >
              <Edit size={14} className="mr-1" />
              Редагувати
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="border-teal-500 text-teal-600 hover:bg-teal-50 text-sm py-2"
            >
              <Download size={14} className="mr-1" />
              PDF
            </Button>
            <Button
              onClick={() => setIsEmailDialogOpen(true)}
              variant="outline"
              className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 text-sm py-2"
            >
              <Mail size={14} className="mr-1" />
              Email
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 text-sm py-2"
            >
              <Trash2 size={14} className="mr-1" />
              Видалити
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редагування профілю</DialogTitle>
            <DialogDescription>
              Оновіть інформацію про вашу компанію
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Logo Upload Section */}
            <div className="border-b pb-4">
              <Label>Логотип компанії</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="text-gray-400" size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLogo}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setUploadingLogo(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const token = localStorage.getItem('token');
                        const response = await axios.post(`${API_URL}/api/upload/logo`, formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        
                        toast.success('Логотип завантажено');
                        // Reload to show new logo
                        if (onUpdate) onUpdate();
                      } catch (error) {
                        console.error('Error uploading logo:', error);
                        toast.error('Помилка завантаження логотипу');
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG до 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Company Info Section */}
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-700">Інформація про компанію</h4>
              <div>
                <Label>Назва компанії</Label>
                <Input
                  value={formData.representative_name}
                  onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                />
              </div>
              <div>
                <Label>ЄДРПОУ {searchingEdrpou && <span className="text-xs text-teal-600">(пошук даних...)</span>}</Label>
                <div className="relative">
                  <Input
                    value={formData.edrpou}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, edrpou: value });
                      if (value.length === 8 || value.length === 10) {
                        searchByEdrpou(value);
                      }
                    }}
                    placeholder="8 або 10 цифр"
                  />
                  {searchingEdrpou && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Дані підтягуються автоматично при введенні 8 цифр (ЮрОсоба) або 10 цифр (ФОП)
                </p>
              </div>
              <div>
                <Label>Юридична адреса {searchingEdrpou && <span className="text-xs text-teal-600">(оновлюється...)</span>}</Label>
                <Input
                  value={formData.legal_address}
                  onChange={(e) => setFormData({ ...formData, legal_address: e.target.value })}
                  placeholder="Автоматично заповниться за ЄДРПОУ або введіть вручну"
                />
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-700">Контактні дані</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+380501234567"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>IBAN</Label>
              <Input
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              />
            </div>

            {/* Banking Info Section */}
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-700">Банківські реквізити</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Назва банку</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="АТ КБ 'ПриватБанк'"
                  />
                </div>
                <div>
                  <Label>МФО</Label>
                  <Input
                    value={formData.mfo}
                    onChange={(e) => setFormData({ ...formData, mfo: e.target.value })}
                    placeholder="305299"
                  />
                </div>
              </div>
            </div>

            {/* Management Section */}
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-700">Керівництво та підписи</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Директор (ПІБ)</Label>
                  <Input
                    value={formData.director_name}
                    onChange={(e) => handleDirectorNameChange(e.target.value)}
                    placeholder="Прізвище Ім'я По батькові"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Автоматично формує "В особі" та "Підпис"
                  </p>
                </div>
                <div>
                  <Label>Посада директора</Label>
                  <Input
                    value={formData.director_position}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    placeholder="Директор"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Діє на підставі</Label>
              <Select 
                value={formData.contract_type} 
                onValueChange={(value) => handleContractTypeChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть підставу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Статуту">Статуту</SelectItem>
                  <SelectItem value="Довіреності">Довіреності</SelectItem>
                  <SelectItem value="Виписки з ЄДР">Виписки з ЄДР</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>В особі</Label>
              <Input
                value={formData.represented_by}
                onChange={(e) => setFormData({ ...formData, represented_by: e.target.value })}
                placeholder="директора Іванова Івана Івановича, що діє на підставі Статуту"
              />
            </div>
            <div>
              <Label>Підпис</Label>
              <Input
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
              />
            </div>
            
            {/* VAT Settings */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label>Платник ПДВ</Label>
                  <p className="text-sm text-gray-500">Чи є ваша компанія платником ПДВ</p>
                </div>
                <Switch
                  checked={formData.vat_payer}
                  onCheckedChange={(checked) => setFormData({ ...formData, vat_payer: checked })}
                />
              </div>
              {formData.vat_payer && (
                <div>
                  <Label>Ставка ПДВ (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 20 })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={handleSaveProfile} className="bg-teal-500 hover:bg-teal-600">
                Зберегти
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Надіслати профіль на email</DialogTitle>
            <DialogDescription>
              Введіть email адресу для відправки профілю компанії
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email адреса</Label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={handleSendEmail} className="bg-cyan-500 hover:bg-cyan-600">
                Надіслати
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердження видалення</DialogTitle>
            <DialogDescription>
              Ви впевнені, що хочете видалити профіль? Цю дію не можна скасувати.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleDeleteProfile} variant="destructive">
              Видалити
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileCard;
