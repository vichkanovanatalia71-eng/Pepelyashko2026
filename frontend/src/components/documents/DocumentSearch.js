import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

const DocumentSearch = ({ value, onChange, placeholder = "Введіть назву компанії або ЄДРПОУ" }) => {
  return (
    <div className="mb-4">
      <Label className="text-sm text-gray-600">Пошук за назвою або ЄДРПОУ</Label>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
    </div>
  );
};

export default DocumentSearch;
