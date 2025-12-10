import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentSearch from './DocumentSearch';
import DocumentCard from './DocumentCard';

const DocumentListGeneric = ({ 
  documents,
  title,
  searchValue, 
  onSearchChange, 
  onViewDocument,
  theme,
  filterByEdrpou,
  emptyMessage = "Немає документів",
  renderContent
}) => {
  const filteredDocuments = filterByEdrpou(documents);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({filteredDocuments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentSearch 
          value={searchValue} 
          onChange={onSearchChange}
        />

        {filteredDocuments.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            {searchValue ? `${emptyMessage} за таким запитом не знайдено` : emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc._id}
                document={doc}
                theme={theme}
                onView={() => onViewDocument(doc)}
                showEditIcon={false}
              >
                {renderContent(doc, theme)}
              </DocumentCard>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentListGeneric;
