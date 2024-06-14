import { NextRequest, NextResponse } from 'next/server';
import { getFrameHtmlResponse } from '@coinbase/onchainkit/frame';
import { NEXT_PUBLIC_URL } from '../../config';

const duneApiKey: string = process.env.DUNE_API_KEY!;

if (!duneApiKey) {
  throw new Error('DUNE_API_KEY is not defined in environment variables');
}

async function getResults(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const executionId = searchParams.get('execution_id');

  if (!executionId) {
    return new NextResponse('Execution ID is required', { status: 400 });
  }

  try {
    const resultsHeaders: HeadersInit = new Headers();
    resultsHeaders.set('X-Dune-API-Key', duneApiKey);

    const resultsResponse = await fetch(
      `https://api.dune.com/api/v1/query/3824077/results?limit=1000`,
      {
        method: 'GET',
        headers: resultsHeaders,
      },
    );

    const resultsData = await resultsResponse.json();
    const totalTips = resultsData.result?.rows?.[0]?.total_tips;

    if (totalTips !== undefined) {
      return new NextResponse(
        getFrameHtmlResponse({
          buttons: [
            {
              action: 'link',
              label: 'Visit Dune Analytics',
              target: 'https://dune.com/queries/3824077',
            },
          ],
          image: {
            src: `${NEXT_PUBLIC_URL}/verified.png`,
            aspectRatio: '1:1',
          },
          postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
        }),
      );
    } else {
      return new NextResponse(
        getFrameHtmlResponse({
          buttons: [
            {
              action: 'link',
              label: 'Try Again',
              target: 'https://dune.com/queries/3824077',
            },
          ],
          image: {
            src: `${NEXT_PUBLIC_URL}/not_verified.png`,
            aspectRatio: '1:1',
          },
          postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
        }),
      );
    }
  } catch (error) {
    console.error('Error fetching results:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  return getResults(req);
}
