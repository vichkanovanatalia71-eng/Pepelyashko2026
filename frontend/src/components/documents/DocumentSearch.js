import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DocumentSearch = ({ value, onChange, placeholder = "Введіть ЄДРПОУ контрагента" }) => {
  return (
    <div className="mb-4">
      <Label className="text-sm text-gray-600">Пошук за ЄДРПОУ</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="max-w-md"
      />
    </div>
  );
};

export default DocumentSearch;
