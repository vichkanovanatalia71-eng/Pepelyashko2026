import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  LogOut, 
  User, 
  FileText, 
  Users, 
  Settings,
  Code
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [counterparties, setCounterparties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [counterpartiesRes, invoicesRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/api/counterparties`),
        axios.get(`${API_URL}/api/invoices`),
        axios.get(`${API_URL}/api/orders`)
      ]);

      setCounterparties(counterpartiesRes.data);
      setInvoices(invoicesRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Ви успішно вийшли з системи');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Система Управління Документами</h1>
              <p className="text-sm text-gray-600">
                Вітаємо, {user?.full_name || user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/templates')}
              >
                <Code className="w-4 h-4 mr-2" />
                Шаблони
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Вийти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Контрагенти</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counterparties.length}</div>
              <p className="text-xs text-muted-foreground">
                Всього в системі
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Рахунки</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
              <p className="text-xs text-muted-foreground">
                Створено рахунків
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Замовлення</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                Створено замовлень
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="counterparties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="counterparties">
              <Users className="w-4 h-4 mr-2" />
              Контрагенти
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Документи
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Профіль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counterparties" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Список Контрагентів</CardTitle>
                <CardDescription>
                  Всі ваші бізнес-партнери
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Завантаження...</p>
                ) : counterparties.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Немає контрагентів. Додайте першого!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {counterparties.map((counterparty) => (
                      <Card key={counterparty._id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{counterparty.representative_name}</p>
                              <p className="text-sm text-gray-500">
                                ЄДРПОУ: {counterparty.edrpou}
                              </p>
                              <p className="text-sm text-gray-500">
                                {counterparty.email} | {counterparty.phone}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Останні Документи</CardTitle>
                <CardDescription>
                  Рахунки та замовлення
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Завантаження...</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Рахунки ({invoices.length})</h3>
                      {invoices.length === 0 ? (
                        <p className="text-sm text-gray-500">Немає рахунків</p>
                      ) : (
                        <div className="space-y-2">
                          {invoices.slice(0, 5).map((invoice) => (
                            <Card key={invoice._id}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">№{invoice.number}</p>
                                    <p className="text-xs text-gray-500">
                                      {invoice.counterparty_name}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold">
                                    {invoice.total_amount} грн
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Замовлення ({orders.length})</h3>
                      {orders.length === 0 ? (
                        <p className="text-sm text-gray-500">Немає замовлень</p>
                      ) : (
                        <div className="space-y-2">
                          {orders.slice(0, 5).map((order) => (
                            <Card key={order._id}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">№{order.number}</p>
                                    <p className="text-xs text-gray-500">
                                      {order.counterparty_name}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold">
                                    {order.total_amount} грн
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Профіль Користувача</CardTitle>
                <CardDescription>
                  Ваші особисті дані
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">ПІБ</p>
                  <p className="text-lg">{user?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg">{user?.email}</p>
                </div>
                {user?.company_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Компанія</p>
                    <p className="text-lg">{user.company_name}</p>
                  </div>
                )}
                {user?.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Телефон</p>
                    <p className="text-lg">{user.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
