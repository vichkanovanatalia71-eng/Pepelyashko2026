import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentSearch from './DocumentSearch';
import DocumentCard from './DocumentCard';

const InvoiceList = ({ 
  invoices, 
  searchValue, 
  onSearchChange, 
  onViewInvoice,
  onEditInvoice,
  theme,
  filterByEdrpou 
}) => {
  const filteredInvoices = filterByEdrpou(invoices);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Список Рахунків ({filteredInvoices.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentSearch 
          value={searchValue} 
          onChange={onSearchChange}
        />

        {filteredInvoices.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            {searchValue ? 'Рахунків за таким запитом не знайдено' : 'Немає рахунків'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredInvoices.map((invoice) => (
              <DocumentCard
                key={invoice._id}
                document={invoice}
                theme={theme}
                onView={() => onViewInvoice(invoice)}
                onEdit={() => {
                  onViewInvoice(invoice);
                  setTimeout(() => onEditInvoice(invoice), 100);
                }}
                showEditIcon={true}
              >
                <div>
                  <p className={`font-medium ${theme.text}`}>№{invoice.number}</p>
                  <p className="text-sm text-gray-600">{invoice.counterparty_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(invoice.date).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <div className="text-right mt-2">
                  <p className={`font-bold text-lg ${theme.text}`}>{invoice.total_amount} грн</p>
                </div>
              </DocumentCard>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceList;
