import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileEdit } from 'lucide-react';

const EditDocumentConfirmDialog = ({
  open,
  onClose,
  documentType,
  documentNumber,
  orderNumber,
  onOpenOrder
}) => {
  const documentNames = {
    'invoice': 'рахунок',
    'act': 'акт',
    'waybill': 'накладну'
  };

  const documentName = documentNames[documentType] || 'документ';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-blue-600" />
            Редагування документа
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Щоб змінити {documentName} <span className="font-bold">№{documentNumber}</span>, потрібно змінити замовлення.
              </p>
              <p className="text-sm text-gray-600">
                Цей документ був створений на основі замовлення <span className="font-semibold">№{orderNumber}</span>
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Хочете відкрити замовлення №{orderNumber} для редагування?
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Скасувати
          </Button>
          <Button 
            onClick={() => {
              onOpenOrder();
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Відкрити замовлення
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDocumentConfirmDialog;
