import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentSearch from './DocumentSearch';
import DocumentCard from './DocumentCard';

const ActList = ({ 
  acts, 
  searchValue, 
  onSearchChange, 
  onViewAct,
  onEditAct,
  theme,
  filterByEdrpou 
}) => {
  const filteredActs = filterByEdrpou(acts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Список Актів ({filteredActs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentSearch 
          value={searchValue} 
          onChange={onSearchChange}
        />

        {filteredActs.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            {searchValue ? 'Актів за таким запитом не знайдено' : 'Немає актів'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredActs.map((act) => (
              <DocumentCard
                key={act._id}
                document={act}
                theme={theme}
                onView={() => onViewAct(act)}
                onEdit={() => {
                  onViewAct(act);
                  setTimeout(() => onEditAct(act), 100);
                }}
                showEditIcon={true}
              >
                <div>
                  <p className={`font-medium ${theme.text}`}>№{act.number}</p>
                  <p className="text-sm text-gray-600 truncate">{act.counterparty_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(act.date).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <div className="text-right mt-2">
                  <p className={`font-bold text-lg ${theme.text}`}>{act.total_amount} грн</p>
                </div>
              </DocumentCard>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActList;
