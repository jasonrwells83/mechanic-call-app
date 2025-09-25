import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LeftNavigation } from './LeftNavigation';
import { TopBar } from './TopBar';
import { RightDockPanel } from './RightDockPanel';
import { useKeyboardStore } from '@/stores';

export function MainLayout() {
  const navigate = useNavigate();
  const { handleKeyDown } = useKeyboardStore();

  // Global keyboard shortcuts using the keyboard store
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Use the keyboard store to handle shortcuts
      handleKeyDown(e);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar />
      <Separator />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Navigation Panel */}
          <ResizablePanel 
            defaultSize={16} 
            minSize={12} 
            maxSize={24}
            className="bg-muted/30"
          >
            <ScrollArea className="h-full">
              <LeftNavigation />
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Main Content Panel */}
          <ResizablePanel defaultSize={84} minSize={40}>
            <ScrollArea className="h-full">
              <div className="p-6">
                <Outlet />
              </div>
            </ScrollArea>
          </ResizablePanel>
          
        </ResizablePanelGroup>
      </div>
      
      {/* New Right Dock Panel */}
      <RightDockPanel />
    </div>
  );
}
