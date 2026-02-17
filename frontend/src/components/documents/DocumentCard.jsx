import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit2 } from 'lucide-react';

const DocumentCard = ({ 
  document, 
  theme, 
  onView, 
  onEdit, 
  showEditIcon = false,
  children 
}) => {
  return (
    <Card 
      className={`card-hover ${theme.cardBg} border-2 ${theme.cardBorder} ${theme.shadow} transition-all duration-300 group`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 cursor-pointer" onClick={onView}>
            {children}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="h-8 w-8 p-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {showEditIcon && onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentCard;
