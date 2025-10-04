import { StockRowData } from '@/types';

// This is a mock backend to simulate API calls and file system operations.
// In a real desktop application, this would interact with Node.js APIs (e.g., `fs`, `path`).

const logEvent = new CustomEvent('log', {
  detail: {
    timestamp: new Date().toLocaleTimeString(),
    message: '',
    type: 'info',
  },
});

const emitLog = (message: string, type: 'info' | 'error' | 'step' | 'warning' = 'info') => {
  logEvent.detail.message = message;
  logEvent.detail.type = type as 'info' | 'error' | 'step';
  logEvent.detail.timestamp = new Date().toLocaleTimeString();
  window.dispatchEvent(new CustomEvent('log', { detail: { ...logEvent.detail } }));
};

let isRunning = false;
let abortController = new AbortController();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getFormattedTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
};

export const backend = {
  async startBot(rows: StockRowData[]) {
    if (isRunning) {
      emitLog('Bot is already running.', 'error');
      return;
    }
    isRunning = true;
    abortController = new AbortController();
    const { signal } = abortController;

    emitLog('Starting bot run...', 'info');
    await delay(500);

    for (const row of rows) {
      if (signal.aborted) {
        emitLog('Run aborted by user.', 'error');
        isRunning = false;
        return;
      }

      // 1. Log start
      emitLog(`Execution started for stock ${row.code}`, 'step');
      await delay(1000);

      if (signal.aborted) {
        emitLog('Run aborted during process.', 'error');
        isRunning = false;
        return;
      }

      // 2. Create folder
      const folderName = `${row.code}_${getFormattedTimestamp()}`;
      // In a real app, this would be: fs.mkdirSync(path.join(basePath, folderName));
      emitLog(`> Created folder ${folderName}`, 'info');
      await delay(500);

      if (signal.aborted) {
        emitLog('Run aborted during process.', 'error');
        isRunning = false;
        return;
      }

      // 3. Save image
      if (row.images.length > 0) {
        for (const image of row.images) {
           // In a real app, you'd save each file:
           // fs.copyFileSync(image.path, path.join(basePath, folderName, image.name));
          emitLog(`> Saved uploaded image: ${image.name}`, 'info');
          await delay(300);
        }
      } else {
        emitLog(`> No image uploaded for ${row.code}, skipping save.`, 'info');
      }
      await delay(500);
    }

    emitLog('Bot run completed successfully.', 'info');
    isRunning = false;
  },

  abortRun() {
    if (!isRunning) {
      emitLog('No bot run is currently active.', 'info');
      return;
    }
    abortController.abort();
    emitLog('Abort signal sent.', 'warning');
  },

  openLatestRunFolder() {
    emitLog('Opening latest run folder... (mocked)', 'info');
    // In a real Electron/Tauri app, you'd use an IPC call here.
    alert('This would open the file explorer to the latest run folder.');
  },
};
