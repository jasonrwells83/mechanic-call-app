import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw } from 'lucide-react';
import { STATUS_METADATA } from '@/lib/job-status-transitions';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import type { JobStatus } from '@/types/database';

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }

  const bigint = parseInt(normalized, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${clampColorChannel(r).toString(16).padStart(2, '0')}${clampColorChannel(g)
    .toString(16)
    .padStart(2, '0')}${clampColorChannel(b).toString(16).padStart(2, '0')}`.toUpperCase();
}

function generateAccent(hex: string, intensity = 0.12) {
  const { r, g, b } = hexToRgb(hex);
  const lighten = {
    r: r + (255 - r) * intensity,
    g: g + (255 - g) * intensity,
    b: b + (255 - b) * intensity,
  };
  return rgbToHex(lighten);
}

function getContrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#f8fafc';
}

function normalizeHex(value: string) {
  if (!value) return '#000000';
  const cleaned = value.replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length === 3) {
    const expanded = cleaned
      .split('')
      .map((char) => char.repeat(2))
      .join('');
    return `#${expanded}`.toUpperCase();
  }
  if (cleaned.length === 6) {
    return `#${cleaned}`.toUpperCase();
  }
  return `#${cleaned.padEnd(6, '0')}`.substring(0, 7).toUpperCase();
}

const defaultPalettes: Record<JobStatus, { primary: string; accent: string }> = {
  'incoming-call': { primary: '#64748B', accent: generateAccent('#64748B', 0.16) },
  scheduled: { primary: '#2563EB', accent: generateAccent('#2563EB', 0.16) },
  'in-bay': { primary: '#16A34A', accent: generateAccent('#16A34A', 0.16) },
  'waiting-parts': { primary: '#EA580C', accent: generateAccent('#EA580C', 0.16) },
  completed: { primary: '#0F172A', accent: generateAccent('#0F172A', 0.16) },
};

export function StatusColorSection() {
  const { data, updateStatusPalettes } = useSettingsForm();
  const palettes = data.statusPalettes;

  const statusEntries = useMemo(() => {
    return (Object.entries(STATUS_METADATA) as Array<[
      JobStatus,
      (typeof STATUS_METADATA)[JobStatus]
    ]>).map(([status, metadata]) => {
      const palette = palettes[status] ?? defaultPalettes[status];
      return {
        status,
        label: metadata.label,
        description: metadata.description,
        color: palette.primary,
        accent: palette.accent,
      };
    });
  }, [palettes]);

  const activePalettes = statusEntries.length;

  const updateColor = (status: JobStatus, color: string) => {
    const normalized = normalizeHex(color);
    updateStatusPalettes((current) => ({
      ...current,
      [status]: {
        primary: normalized,
        accent: generateAccent(normalized),
      },
    }));
  };

  const resetColor = (status: JobStatus) => {
    const base = defaultPalettes[status];
    updateStatusPalettes((current) => ({
      ...current,
      [status]: base,
    }));
  };

  const resetAll = () => {
    updateStatusPalettes(() => ({ ...defaultPalettes }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status palettes</CardTitle>
              <CardDescription>
                Adjust the primary color for each workflow status. Calendar events, kanban cards, and timelines will reflect these values.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {activePalettes} statuses configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusEntries.map((config) => {
            const textColor = getContrastText(config.color);
            const accentText = getContrastText(config.accent);

            return (
              <div
                key={config.status}
                className="space-y-4 rounded-lg border border-border bg-muted/10 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{config.label}</h3>
                      <Badge variant="outline" className="text-xs capitalize">
                        {config.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => resetColor(config.status)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset default
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={`color-picker-${config.status}`}>Primary color</Label>
                    <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/40 p-3">
                      <input
                        id={`color-picker-${config.status}`}
                        type="color"
                        value={config.color}
                        onChange={(event) => updateColor(config.status, event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-md border"
                      />
                      <Input
                        value={config.color}
                        onChange={(event) => updateColor(config.status, event.target.value)}
                        className="font-mono uppercase"
                        aria-label={`${config.label} hex code`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drives the solid fill used for cards, badges, and KPI highlights.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Solid preview</Label>
                      <div
                        className="flex h-20 items-center justify-center rounded-md text-sm font-medium shadow-sm"
                        style={{ backgroundColor: config.color, color: textColor }}
                      >
                        {config.label}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent preview</Label>
                      <div
                        className="flex h-20 items-center justify-center rounded-md border text-sm font-medium"
                        style={{ backgroundColor: config.accent, color: accentText }}
                      >
                        {config.label} (accent)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <Button variant="outline" size="sm" onClick={resetAll} className="md:w-auto">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset all to defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage notes</CardTitle>
          <CardDescription>
            Status colors sync with kanban, calendar, and reporting components; persistence will hook into InstantDB during Task 10.6.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Aim for high contrast so status text remains readable on both light and dark surfaces.</p>
          <p>- Accent shades power background glows, resource chips, and hover states.</p>
          <p>- Hex codes are validated automatically; we expand shorthand values for consistency.</p>
        </CardContent>
      </Card>
    </div>
  );
}

