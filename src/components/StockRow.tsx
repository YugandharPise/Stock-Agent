import * as React from 'react';
import { StockRowData } from '@/types';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Trash2, Paperclip } from 'lucide-react';

interface StockRowProps {
  rowData: StockRowData;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof Omit<StockRowData, 'id' | 'images'>,
    value: string
  ) => void;
  onFilesChange: (id: string, files: File[]) => void;
  hasError: boolean;
}

export const StockRow: React.FC<StockRowProps> = ({
  rowData,
  onDelete,
  onUpdate,
  onFilesChange,
  hasError,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesChange(rowData.id, Array.from(event.target.files));
    }
  };

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-md border ${
        hasError ? 'border-destructive bg-destructive/10' : 'border-transparent'
      }`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 flex-grow">
        <Input
          placeholder="Stock ISIN"
          value={rowData.isin}
          onChange={(e) => onUpdate(rowData.id, 'isin', e.target.value)}
          className={hasError && !rowData.isin ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        <Input
          placeholder="Stock Code"
          value={rowData.code}
          onChange={(e) => onUpdate(rowData.id, 'code', e.target.value)}
          className={hasError && !rowData.code ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        <Input
          placeholder="Stock Name"
          value={rowData.name}
          onChange={(e) => onUpdate(rowData.id, 'name', e.target.value)}
        />
        <Textarea
          placeholder="Comment"
          value={rowData.comment}
          onChange={(e) => onUpdate(rowData.id, 'comment', e.target.value)}
          className="h-10 max-h-28 resize-y"
        />
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleFileButtonClick}>
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach images ({rowData.images.length})</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-sm text-muted-foreground truncate">
            {rowData.images.length > 0
              ? `${rowData.images.length} file(s)`
              : 'No files'}
          </span>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => onDelete(rowData.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete Row</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
