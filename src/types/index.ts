export interface StockRowData {
  id: string;
  isin: string;
  code: string;
  name: string;
  comment: string;
  images: File[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
