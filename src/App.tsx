import StockBot from '@/components/StockBot';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-8">
        <StockBot />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
