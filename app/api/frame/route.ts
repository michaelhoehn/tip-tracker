import { FrameRequest, getFrameMessage, getFrameHtmlResponse } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';
import { NEXT_PUBLIC_URL } from '../../config';

const duneApiKey: string = process.env.DUNE_API_KEY!;
const neynarApiKey: string = process.env.NEXT_PUBLIC_NEYNAR_API_KEY!;

if (!duneApiKey) {
  throw new Error('DUNE_API_KEY is not defined in environment variables');
}
if (!neynarApiKey) {
  throw new Error('NEXT_PUBLIC_NEYNAR_API_KEY is not defined in environment variables');
}

async function handleInitialRequest(body: any): Promise<NextResponse> {
  try {
    const { isValid, message } = await getFrameMessage(body, {
      neynarApiKey,
      // allowFramegear: true,
    });

    if (!isValid) {
      return new NextResponse('Message not valid', { status: 500 });
    }

    // const fid = 253746;
    const fid = message.interactor.fid;
    const userHeaders: HeadersInit = new Headers();
    userHeaders.set('accept', 'application/json');
    userHeaders.set('api_key', neynarApiKey);

    const userResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: userHeaders,
    });

    if (!userResponse.ok) {
      return new NextResponse(`Neynar API request failed with status: ${userResponse.status}`, {
        status: userResponse.status,
      });
    }

    const userData = await userResponse.json();
    const username = userData?.users?.[0]?.username;

    if (!username) {
      return new NextResponse('Username not found', { status: 500 });
    }

    const duneHeaders: HeadersInit = new Headers();
    duneHeaders.set('X-Dune-API-Key', duneApiKey);

    const queryResponse = await fetch(
      `https://api.dune.com/api/v1/query/3835652/results?limit=1&filters=username='${'@' + username}'`,
      {
        method: 'GET',
        headers: duneHeaders,
      },
    );

    const resultsData = await queryResponse.json();
    const totalTips = resultsData.result?.rows?.[0]?.['Total Tip Amount'] || 0;

    const dynamicImageUrl = `${NEXT_PUBLIC_URL}/api/frame/generate-image?username=${username}&totalTips=${totalTips}`;

    console.log(`Dynamic Image URL: ${dynamicImageUrl}`);

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
          src: dynamicImageUrl,
          aspectRatio: '1:1',
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
        state: { totalTips, username },
      }),
    );
  } catch (error) {
    console.error('Error processing initial request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    return handleInitialRequest(body);
  } catch (error) {
    console.error('Error in POST request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
