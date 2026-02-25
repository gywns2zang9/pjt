import { NextRequest, NextResponse } from 'next/server';
import { StockService } from '@/lib/stock/service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!symbol || !start || !end) {
        return NextResponse.json({ error: 'Symbol, start, and end dates are required' }, { status: 400 });
    }

    try {
        const history = await StockService.getHistory(symbol, start, end);
        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
