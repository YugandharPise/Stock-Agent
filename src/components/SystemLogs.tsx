import { useEffect, useRef, useState } from 'react';
import { LogEntry } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Eraser } from 'lucide-react';

interface SystemLogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function SystemLogs({ logs, onClear }: SystemLogsProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'step':
        return 'text-blue-500';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-foreground/80">System Logs</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoscroll-switch"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            />
            <Label htmlFor="autoscroll-switch" className="text-xs">
              Autoscroll
            </Label>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7">
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="bg-background border rounded-lg p-2 flex-grow h-32 min-h-[8rem]">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <pre className="text-xs font-mono whitespace-pre-wrap p-2">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="flex">
                  <span className="text-muted-foreground/80 mr-2">{log.timestamp} -</span>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground"> Logs will appear here...</span>
            )}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}
