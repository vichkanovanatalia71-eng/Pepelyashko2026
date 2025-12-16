import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, List, Grid2X2, Grid3X3, Eye, Edit2 } from 'lucide-react';

const InvoiceList = ({ 
  invoices, 
  searchValue, 
  onSearchChange, 
  onViewInvoice,
  onEditInvoice,
  theme,
  filterByEdrpou,
  sortBy = 'date_desc',
  onSortByChange,
  viewMode = 'grid2',
  onViewModeChange
}) => {
  const filteredInvoices = filterByEdrpou(invoices);
  
  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        return new Date(a.date || a.created_at || 0) - new Date(b.date || b.created_at || 0);
      case 'date_desc':
        return new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0);
      case 'number_asc':
        return (a.number || '').localeCompare(b.number || '', 'uk', { numeric: true });
      case 'number_desc':
        return (b.number || '').localeCompare(a.number || '', 'uk', { numeric: true });
      case 'amount_asc':
        return (a.total_amount || 0) - (b.total_amount || 0);
      case 'amount_desc':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'counterparty_asc':
        return (a.counterparty_name || '').localeCompare(b.counterparty_name || '', 'uk');
      case 'counterparty_desc':
        return (b.counterparty_name || '').localeCompare(a.counterparty_name || '', 'uk');
      default:
        return 0;
    }
  });

  // Calculate total
  const totalAmount = sortedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Get grid class based on view mode
  const getGridClass = () => {
    switch (viewMode) {
      case 'list':
        return 'flex flex-col gap-2';
      case 'grid3':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3';
      case 'grid2':
      default:
        return 'grid grid-cols-1 lg:grid-cols-2 gap-3';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Список Рахунків ({sortedInvoices.length})</span>
          <span className="text-lg font-bold text-green-600">
            Загальна сума: {totalAmount.toLocaleString('uk-UA', {minimumFractionDigits: 2, maximumFractionDigits: 2})} грн
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters Row */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-medium mb-1 block text-gray-600">
                <Search className="w-3 h-3 inline mr-1" />
                Пошук
              </Label>
              <Input
                type="text"
                placeholder="Номер, контрагент, ЄДРПОУ або товар"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Sort */}
            <div className="w-full sm:w-48">
              <Label className="text-xs font-medium mb-1 block text-gray-600">
                <ArrowUpDown className="w-3 h-3 inline mr-1" />
                Сортування
              </Label>
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Сортувати" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">📅 Дата ↓ (нові)</SelectItem>
                  <SelectItem value="date_asc">📅 Дата ↑ (старі)</SelectItem>
                  <SelectItem value="number_desc">🔢 Номер ↓</SelectItem>
                  <SelectItem value="number_asc">🔢 Номер ↑</SelectItem>
                  <SelectItem value="amount_desc">💰 Сума ↓ (більша)</SelectItem>
                  <SelectItem value="amount_asc">💰 Сума ↑ (менша)</SelectItem>
                  <SelectItem value="counterparty_asc">👤 Контрагент А-Я</SelectItem>
                  <SelectItem value="counterparty_desc">👤 Контрагент Я-А</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Вигляд:</span>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => onViewModeChange('list')}
                className={`h-7 px-2 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Список"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'grid2' ? 'default' : 'ghost'}
                onClick={() => onViewModeChange('grid2')}
                className={`h-7 px-2 ${viewMode === 'grid2' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="2 колонки"
              >
                <Grid2X2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'grid3' ? 'default' : 'ghost'}
                onClick={() => onViewModeChange('grid3')}
                className={`h-7 px-2 ${viewMode === 'grid3' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="3 колонки"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {sortedInvoices.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            {searchValue ? 'Рахунків за таким запитом не знайдено' : 'Немає рахунків'}
          </p>
        ) : (
          <div className={getGridClass()}>
            {sortedInvoices.map((invoice) => (
              viewMode === 'list' ? (
                /* LIST VIEW */
                <div 
                  key={invoice._id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${theme.cardBorder} ${theme.cardBg} hover:shadow-md transition-all cursor-pointer`}
                  onClick={() => onViewInvoice(invoice)}
                >
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className={`font-semibold ${theme.text}`}>№{invoice.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{invoice.counterparty_name}</p>
                  </div>
                  <div className="text-right min-w-[90px]">
                    <p className={`font-bold text-sm ${theme.text}`}>{invoice.total_amount} грн</p>
                  </div>
                  <div className="text-xs text-gray-500 min-w-[80px] text-right">
                    {new Date(invoice.date).toLocaleDateString('uk-UA')}
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => onViewInvoice(invoice)} className="h-7 px-2" title="Переглянути">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { onViewInvoice(invoice); setTimeout(() => onEditInvoice(invoice), 100); }} className="h-7 px-2" title="Редагувати">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* GRID VIEW */
                <Card 
                  key={invoice._id} 
                  className={`card-hover ${theme.cardBg} border ${theme.cardBorder} ${theme.shadow} transition-all duration-300 group cursor-pointer overflow-hidden`}
                  onClick={() => onViewInvoice(invoice)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${theme.text} shrink-0`}>№{invoice.number}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {new Date(invoice.date).toLocaleDateString('uk-UA')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1" title={invoice.counterparty_name}>{invoice.counterparty_name}</p>
                        <p className={`font-bold ${theme.text} mt-1`}>{invoice.total_amount} грн</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => onViewInvoice(invoice)} className="h-7 px-2">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { onViewInvoice(invoice); setTimeout(() => onEditInvoice(invoice), 100); }} className="h-7 px-2">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceList;
