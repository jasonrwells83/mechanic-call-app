import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopHoursSection } from '@/components/settings/ShopHoursSection';
import { BayConfigurationSection } from '@/components/settings/BayConfigurationSection';
import { StatusColorSection } from '@/components/settings/StatusColorSection';
import { SchedulingDefaultsSection } from '@/components/settings/SchedulingDefaultsSection';
import { SettingsFormProvider, useSettingsForm } from '@/hooks/useSettingsForm';
import {
  Building,
  Clock,
  Palette,
  Save,
  Settings,
  SlidersHorizontal,
  Timer,
  Wrench
} from 'lucide-react';

type SettingsSection = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
  renderContent?: () => React.ReactNode;
};

const settingsSections: SettingsSection[] = [
  {
    id: 'general-preferences',
    label: 'General Preferences',
    description: 'Shop identity and global defaults',
    icon: Building,
    placeholder: 'Task 10.1 establishes the structure. General preferences will be wired once downstream requirements are defined.'
  },
  {
    id: 'shop-hours',
    label: 'Shop Hours',
    description: 'Business hours, closures, and overrides',
    icon: Clock,
    placeholder: 'Interactive weekly hours and exception management built in Task 10.2.',
    renderContent: () => <ShopHoursSection />
  },
  {
    id: 'service-bays',
    label: 'Service Bays',
    description: 'Customize bay names and visibility',
    icon: Wrench,
    placeholder: 'Service bay editor added in Task 10.3 for renaming and managing bay availability.',
    renderContent: () => <BayConfigurationSection />
  },
  {
    id: 'status-appearance',
    label: 'Status Appearance',
    description: 'Color coding and visual themes',
    icon: Palette,
    placeholder: 'Interactive color editor delivered in Task 10.4 for customizing status palettes.',
    renderContent: () => <StatusColorSection />
  },
  {
    id: 'scheduling-defaults',
    label: 'Scheduling Defaults',
    description: 'Time slots, duration, and buffers',
    icon: Timer,
    placeholder: 'Scheduling defaults interface built in Task 10.5 for durations, buffers, and policies.',
    renderContent: () => <SchedulingDefaultsSection />
  },
  {
    id: 'data-management',
    label: 'Data Management',
    description: 'Persistence, validation, and backups',
    icon: SlidersHorizontal,
    placeholder: 'Task 10.6 covers saving, validation, and sync with the InstantDB backend.'
  }
];

function SettingsPageInner() {
  const { saveChanges, resetChanges, isDirty, saving, loading, flatErrors } = useSettingsForm();
  const [activeSection, setActiveSection] = useState(settingsSections[0]?.id);

  useEffect(() => {
    if (loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-64px 0px -60% 0px'
      }
    );

    settingsSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [loading]);

  const handleNavigationClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, sectionId: string) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Settings</h1>
          <p className="text-muted-foreground">
            Centralize configuration for scheduling, bays, and visual preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetChanges} disabled={!isDirty || saving}>
            Reset Changes
          </Button>
          <Button onClick={saveChanges} disabled={!isDirty || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {flatErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Resolve validation issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {flatErrors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle>Configuration Areas</CardTitle>
            <CardDescription>Jump to a specific settings section</CardDescription>
          </CardHeader>
          <CardContent>
            <nav className="flex flex-col gap-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(event) => handleNavigationClick(event, section.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{section.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {section.description}
                      </span>
                    </div>
                  </a>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {settingsSections.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {section.label}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {section.renderContent ? (
                      section.renderContent()
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 py-12 text-center text-muted-foreground">
                        <Settings className="h-10 w-10 opacity-40" />
                        <p className="max-w-xl text-sm leading-relaxed">
                          {section.placeholder}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}




export function SettingsPage() {
  return (
    <SettingsFormProvider>
      <SettingsPageInner />
    </SettingsFormProvider>
  );
}




