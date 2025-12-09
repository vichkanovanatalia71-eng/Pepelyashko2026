import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

const OrderFilters = ({ searchEdrpou, onSearchEdrpouChange, paymentFilter, onPaymentFilterChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      {/* EDRPOU Search */}
      <div className="flex-1">
        <Label htmlFor="search-edrpou" className="text-sm font-medium mb-2 block">
          <Search className="w-4 h-4 inline mr-1" />
          Пошук за ЄДРПОУ
        </Label>
        <Input
          id="search-edrpou"
          type="text"
          inputMode="numeric"
          placeholder="Введіть ЄДРПОУ (8 або 10 цифр)"
          maxLength={10}
          value={searchEdrpou}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            onSearchEdrpouChange(value);
          }}
          className="w-full"
        />
      </div>

      {/* Payment Status Filter */}
      <div className="flex-1">
        <Label htmlFor="payment-filter" className="text-sm font-medium mb-2 block">
          <Filter className="w-4 h-4 inline mr-1" />
          Статус оплати
        </Label>
        <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
          <SelectTrigger id="payment-filter">
            <SelectValue placeholder="Всі замовлення" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі замовлення</SelectItem>
            <SelectItem value="paid">Сплачено ✅</SelectItem>
            <SelectItem value="unpaid">Не сплачено ⏳</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default OrderFilters;
