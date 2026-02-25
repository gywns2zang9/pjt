import { NextRequest, NextResponse } from 'next/server';
import { StockService } from '@/lib/stock/service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        const results = await StockService.search(q);
        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
