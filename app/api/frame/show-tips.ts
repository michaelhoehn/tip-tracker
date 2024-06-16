import { NextResponse } from 'next/server';
import { getFrameHtmlResponse } from '@coinbase/onchainkit/frame';
import { NEXT_PUBLIC_URL } from '../../config';

const duneApiKey: string = process.env.DUNE_API_KEY!;

if (!duneApiKey) {
  throw new Error('DUNE_API_KEY is not defined in environment variables');
}

export async function showTips(executionId: string): Promise<NextResponse> {
  try {
    console.log('showTips called with executionId:', executionId);

    const resultsHeaders: HeadersInit = new Headers();
    resultsHeaders.set('X-Dune-API-Key', duneApiKey);

    const resultsResponse = await fetch(
      `https://api.dune.com/api/v1/query/3824077/results?limit=1000&execution_id=${executionId}`,
      {
        method: 'GET',
        headers: resultsHeaders,
      },
    );

    console.log('Dune results response status:', resultsResponse.status);

    const resultsData = await resultsResponse.json();
    console.log('Dune Query Results:', resultsData);

    const totalTips = resultsData.result?.rows?.[0]?.total_tips;
    console.log('Total Tips:', totalTips);

    // Move to Page 3: Tip cmplx link
    return new NextResponse(
      getFrameHtmlResponse({
        buttons: [
          {
            action: 'link',
            label: 'Tip cmplx',
            target: 'https://warpcast.com/cmplx.eth',
          },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/park-1.png`,
          aspectRatio: '1:1',
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
      }),
    );
  } catch (error) {
    console.error('Error fetching results:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
