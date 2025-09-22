import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CommandDialog } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useJobs } from '@/hooks/use-jobs';
import { useSelectionStore } from '@/stores/selection-store';
import type { Job } from '@/types/database';
import { 
  Search, 
  CalendarIcon, 
  User, 
  Settings, 
  LogOut,
  Command as CommandIcon
} from 'lucide-react';

export function TopBar() {
  const [date, setDate] = useState<Date>(new Date());
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandMessage, setCommandMessage] = useState<string | null>(null);
  const { data: jobsResponse } = useJobs();
  const selectItem = useSelectionStore((state) => state.selectItem);
  const jobs = jobsResponse?.data || [];

  // Listen for Cmd/Ctrl + K and / for search
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        // Only if not in an input field
        if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setIsCommandOpen(true);
        }
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const invoiceMatches = React.useMemo(() => {
    const needle = commandQuery.trim().toLowerCase();
    if (!needle) return [] as Job[];
    return jobs.filter((job) => job.invoiceNumber && job.invoiceNumber.toLowerCase().includes(needle)).slice(0, 5);
  }, [commandQuery, jobs]);

  const handleInvoiceSelect = (job: Job) => {
    selectItem({
      id: job.id,
      type: 'job',
      title: job.title,
      subtitle: job.status,
      data: job,
    });
    setIsCommandOpen(false);
    setCommandQuery('');
    setCommandMessage(null);
  };

  const handleCommandSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = commandQuery.trim();
    if (!value) {
      setCommandMessage('Type an invoice number to search.');
      return;
    }

    const match = jobs.find((job) => job.invoiceNumber && job.invoiceNumber.toLowerCase() === value.toLowerCase());
    if (match) {
      handleInvoiceSelect(match);
    } else {
      setCommandMessage(`No job found with invoice # ${value}.`);
    }
  };

  React.useEffect(() => {
    if (!isCommandOpen) {
      setCommandQuery('');
      setCommandMessage(null);
    }
  }, [isCommandOpen]);

  return (
    <>
      <div className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Command Palette Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCommandOpen(true)}
            className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
          >
            <Search className="h-4 w-4 xl:mr-2" />
            <span className="hidden xl:inline-flex">Search commands...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/user.jpg" alt="User" />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Shop Operator</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    operator@shop.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <form className="flex items-center border-b px-3" onSubmit={handleCommandSubmit}>
          <CommandIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            value={commandQuery}
            onChange={(event) => {
              setCommandQuery(event.target.value);
              if (!event.target.value.trim()) {
                setCommandMessage(null);
              }
            }}
            placeholder="Find job by invoice number..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 font-mono"
          />
        </form>
        <div className="p-4 space-y-3 text-sm">
          {commandMessage && (
            <p className="text-destructive">{commandMessage}</p>
          )}
          {invoiceMatches.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Matches</p>
              <ul className="space-y-1">
                {invoiceMatches.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => handleInvoiceSelect(job)}
                      className="w-full text-left rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{job.invoiceNumber}</span>
                        <span className="text-xs text-muted-foreground capitalize">{job.status.replace('-', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{job.title}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Enter an invoice number to jump straight to a job.
            </p>
          )}
        </div>
      </CommandDialog>
    </>
  );
}
