import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, ArrowUpDown, List, Grid2X2, Grid3X3 } from 'lucide-react';

const OrderFilters = ({ 
  searchEdrpou, 
  onSearchEdrpouChange, 
  paymentFilter, 
  onPaymentFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange 
}) => {
  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Search, Payment Filter, Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Universal Search */}
        <div className="flex-1 min-w-0">
          <Label htmlFor="search-edrpou" className="text-xs font-medium mb-1 block text-gray-600">
            <Search className="w-3 h-3 inline mr-1" />
            Пошук
          </Label>
          <Input
            id="search-edrpou"
            type="text"
            placeholder="Номер, назва або ЄДРПОУ"
            value={searchEdrpou}
            onChange={(e) => onSearchEdrpouChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Payment Status Filter */}
        <div className="w-full sm:w-40">
          <Label htmlFor="payment-filter" className="text-xs font-medium mb-1 block text-gray-600">
            <Filter className="w-3 h-3 inline mr-1" />
            Оплата
          </Label>
          <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
            <SelectTrigger id="payment-filter" className="h-9">
              <SelectValue placeholder="Всі" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі</SelectItem>
              <SelectItem value="paid">✅ Сплачено</SelectItem>
              <SelectItem value="unpaid">⏳ Не сплачено</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="w-full sm:w-48">
          <Label htmlFor="sort-by" className="text-xs font-medium mb-1 block text-gray-600">
            <ArrowUpDown className="w-3 h-3 inline mr-1" />
            Сортування
          </Label>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger id="sort-by" className="h-9">
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

      {/* Row 2: View Mode Toggle */}
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
  );
};

export default OrderFilters;
