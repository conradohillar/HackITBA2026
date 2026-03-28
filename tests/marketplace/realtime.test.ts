import { describe, expect, it, vi } from 'vitest';
import type { MarketplaceInvoiceCard } from '@/lib/marketplace/types';
import { purchaseFractions } from '@/lib/marketplace/actions';
import { createMarketplaceRealtimeController } from '@/hooks/use-marketplace-realtime';

const baseInvoice: MarketplaceInvoiceCard = {
  id: 'invoice-1',
  invoiceNumber: 'FAC-1',
  pagadorName: 'Pagador SA',
  amount: 1500000,
  netAmount: 1275000,
  riskTier: 'A',
  discountRate: 0.145,
  totalFractions: 8,
  fundedFractions: 2,
  availableFractions: 6,
  dueDate: '2026-06-28',
};

describe('marketplace purchase action', () => {
  it('rejects invalid payloads and non-investor sessions before any RPC call', async () => {
    const callFundInvoice = vi.fn();

    await expect(
      purchaseFractions(
        { invoiceId: '', fractionCount: 1 },
        {
          getActor: async () => ({ userId: 'investor-1', role: 'inversor' }),
          callFundInvoice,
        },
      ),
    ).resolves.toMatchObject({
      status: 'error',
      message: 'Revisá los datos de la compra e intentá de nuevo.',
    });

    await expect(
      purchaseFractions(
        { invoiceId: 'invoice-1', fractionCount: 0 },
        {
          getActor: async () => ({ userId: 'investor-1', role: 'inversor' }),
          callFundInvoice,
        },
      ),
    ).resolves.toMatchObject({
      status: 'error',
      fieldErrors: {
        fractionCount: expect.any(String),
      },
    });

    await expect(
      purchaseFractions(
        { invoiceId: 'invoice-1', fractionCount: 1 },
        {
          getActor: async () => ({ userId: 'cedente-1', role: 'cedente' }),
          callFundInvoice,
        },
      ),
    ).resolves.toMatchObject({
      status: 'error',
      message: 'Solo un inversor autenticado puede comprar fracciones.',
    });

    expect(callFundInvoice).not.toHaveBeenCalled();
  });
});

describe('marketplace realtime controller', () => {
  it('stays live after SUBSCRIBED and patches invoice progress from updates', async () => {
    const modes: string[] = [];
    const snapshots: MarketplaceInvoiceCard[][] = [];

    let statusHandler: ((status: string) => void) | undefined;
    let invoiceHandler: ((patch: { id: string; fundedFractions: number; totalFractions: number; status: 'funding' | 'funded' }) => void) | undefined;

    const controller = createMarketplaceRealtimeController({
      initialInvoices: [baseInvoice],
      refresh: vi.fn().mockResolvedValue([baseInvoice]),
      onInvoicesChange: (next) => snapshots.push(next),
      onModeChange: (mode) => modes.push(mode),
      subscribeToInvoices: ({ onStatusChange, onInvoiceUpdate }) => {
        statusHandler = onStatusChange;
        invoiceHandler = onInvoiceUpdate;
        return () => undefined;
      },
      setIntervalFn: vi.fn(() => 1),
      clearIntervalFn: vi.fn(),
    });

    controller.start();
    statusHandler?.('SUBSCRIBED');
    invoiceHandler?.({
      id: 'invoice-1',
      fundedFractions: 5,
      totalFractions: 8,
      status: 'funding',
    });

    expect(modes).toEqual(['connecting', 'live']);
    expect(snapshots.at(-1)).toMatchObject([
      {
        id: 'invoice-1',
        fundedFractions: 5,
        totalFractions: 8,
        availableFractions: 3,
      },
    ]);
  });

  it('falls back to polling every 2 seconds when the channel closes or errors', async () => {
    const refresh = vi.fn().mockResolvedValue([
      {
        ...baseInvoice,
        fundedFractions: 6,
        availableFractions: 2,
      },
    ]);
    const modes: string[] = [];
    const snapshots: MarketplaceInvoiceCard[][] = [];
    const clearIntervalFn = vi.fn();
    let pollCallback: (() => void | Promise<void>) | undefined;
    let statusHandler: ((status: string) => void) | undefined;

    const controller = createMarketplaceRealtimeController({
      initialInvoices: [baseInvoice],
      refresh,
      onInvoicesChange: (next) => snapshots.push(next),
      onModeChange: (mode) => modes.push(mode),
      subscribeToInvoices: ({ onStatusChange }) => {
        statusHandler = onStatusChange;
        return () => undefined;
      },
      setIntervalFn: vi.fn((callback) => {
        pollCallback = callback;
        return 7;
      }),
      clearIntervalFn,
    });

    controller.start();
    statusHandler?.('CHANNEL_ERROR');
    await pollCallback?.();
    statusHandler?.('SUBSCRIBED');

    expect(modes).toEqual(['connecting', 'polling', 'live']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toMatchObject([
      {
        id: 'invoice-1',
        fundedFractions: 6,
        availableFractions: 2,
      },
    ]);
    expect(clearIntervalFn).toHaveBeenCalledWith(7);
  });
});
