import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry, StockRowData } from '@/types';
import { backend } from '@/lib/backend';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { StockRow } from './StockRow';
import { SystemLogs } from './SystemLogs';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

const createEmptyRow = (): StockRowData => ({
  id: uuidv4(),
  isin: '',
  code: '',
  name: '',
  comment: '',
  images: [],
});

export default function StockBot() {
  const [activeTab, setActiveTab] = useState('input');
  const [inputRows, setInputRows] = useState<StockRowData[]>([createEmptyRow()]);
  const [dataRows, setDataRows] = useState<StockRowData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const { toast } = useToast();
  const [checkboxes, setCheckboxes] = useState({
    moneycontrol: false,
    stockReport: false,
    tradingview: false,
  });

  const handleCheckboxChange = (name: keyof typeof checkboxes) => {
    setCheckboxes((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const fetchPrefilledData = async () => {
    try {
      const response = await fetch('/data/prefilled_stocks.json');
      const stocks = await response.json();
      setDataRows(
        stocks.map((stock: any) => ({
          ...createEmptyRow(),
          isin: stock.isin,
          code: stock.code,
          name: stock.name || '',
        }))
      );
    } catch (error) {
      console.error('Failed to fetch prefilled stocks:', error);
      addLog('Failed to load pre-filled stock data.', 'error');
    }
  };

  useEffect(() => {
    fetchPrefilledData();
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prevLogs) => [
      ...prevLogs,
      { timestamp: new Date().toLocaleTimeString(), message, type },
    ]);
  };

  useEffect(() => {
    const handleLog = (event: any) => {
      const { timestamp, message, type } = event.detail;
      setLogs((prevLogs) => [...prevLogs, { timestamp, message, type }]);
    };
    window.addEventListener('log', handleLog);
    return () => window.removeEventListener('log', handleLog);
  }, []);

  const handleUpdateRow = (
    id: string,
    field: keyof Omit<StockRowData, 'id' | 'images'>,
    value: string
  ) => {
    const setRows = activeTab === 'input' ? setInputRows : setDataRows;
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleFilesChange = (id: string, files: File[]) => {
    const setRows = activeTab === 'input' ? setInputRows : setDataRows;
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, images: files } : row))
    );
  };

  const handleAddRow = () => {
    const setRows = activeTab === 'input' ? setInputRows : setDataRows;
    setRows((prevRows) => [...prevRows, createEmptyRow()]);
  };

  const handleDeleteRow = (id: string) => {
    const setRows = activeTab === 'input' ? setInputRows : setDataRows;
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
  };

  const handleReset = () => {
    if (activeTab === 'input') {
      setInputRows([createEmptyRow()]);
    } else {
      fetchPrefilledData();
    }
    setResetDialogOpen(false);
    addLog(`'${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}' tab has been reset.`, 'info');
  };

  const validateRows = (rows: StockRowData[]) => {
    const invalidRows = rows.filter(row => !row.isin || !row.code);
    if (invalidRows.length > 0) {
      setValidationError(true);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Please fill in Stock ISIN and Stock Code for all rows.`,
      });
      return false;
    }
    setValidationError(false);
    return true;
  };

  const handleStartBot = () => {
    const currentRows = activeTab === 'input' ? inputRows : dataRows;
    if (validateRows(currentRows)) {
      backend.startBot(currentRows);
    }
  };

  const renderRows = (rows: StockRowData[], setRows: React.Dispatch<React.SetStateAction<StockRowData[]>>) => (
    <div className="space-y-1">
      {rows.map((row) => (
        <StockRow
          key={row.id}
          rowData={row}
          onDelete={handleDeleteRow}
          onUpdate={handleUpdateRow}
          onFilesChange={handleFilesChange}
          hasError={validationError && (!row.isin || !row.code)}
        />
      ))}
      <div className="pt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleAddRow}>
              <PlusCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Row</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg border">
      <ConfirmationDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={activeTab === 'input' ? 'Reset all input?' : 'Reload stored stock list?'}
        description={
          activeTab === 'input'
            ? 'This will clear all fields in the Input tab.'
            : 'Any unsaved edits will be lost.'
        }
        onConfirm={handleReset}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="moneycontrol"
                checked={checkboxes.moneycontrol}
                onCheckedChange={() => handleCheckboxChange('moneycontrol')}
              />
              <Label htmlFor="moneycontrol">Moneycontrol</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stockReport"
                checked={checkboxes.stockReport}
                onCheckedChange={() => handleCheckboxChange('stockReport')}
              />
              <Label htmlFor="stockReport">Stock Report</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tradingview"
                checked={checkboxes.tradingview}
                onCheckedChange={() => handleCheckboxChange('tradingview')}
              />
              <Label htmlFor="tradingview">Tradingview</Label>
            </div>
          </div>
        </div>
        <Card className="mt-4">
          <CardContent className="p-2 sm:p-4">
            <TabsContent value="input" className="mt-0">
              {renderRows(inputRows, setInputRows)}
            </TabsContent>
            <TabsContent value="data" className="mt-0">
              {renderRows(dataRows, setDataRows)}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <SystemLogs logs={logs} onClear={() => setLogs([])} />
        </div>
        <div className="flex flex-col space-y-2 justify-end">
          <Button onClick={handleStartBot}>
            Start Bot
          </Button>
          <Button onClick={backend.abortRun} variant="destructive">
            Abort
          </Button>
          <Button onClick={backend.openLatestRunFolder} variant="secondary">
            Go to folder
          </Button>
          <Button onClick={() => setResetDialogOpen(true)} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
