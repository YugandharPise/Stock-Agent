export interface StockRowData {
  id: string;
  isin: string;
  code: string;
  comment: string;
  images: File[];
}

export type LogEntry = {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'step' | 'warning';
};
