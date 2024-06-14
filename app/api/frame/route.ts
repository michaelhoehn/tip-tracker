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

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();

  try {
    const { isValid, message } = await getFrameMessage(body, {
      neynarApiKey,
      allowFramegear: true, // true to allow debugging in framegear
    });

    if (!isValid) {
      console.error('Message not valid');
      return new NextResponse('Message not valid', { status: 500 });
    }

    // const fid = message.interactor.fid;
    const fid = 253746;
    console.log('FID:', fid);

    // Step 2: Get the username from Neynar API
    const userHeaders: HeadersInit = new Headers();
    userHeaders.set('accept', 'application/json');
    userHeaders.set('api_key', neynarApiKey);

    const userResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: userHeaders,
    });

    if (!userResponse.ok) {
      console.error(`Neynar API request failed with status: ${userResponse.status}`);
      return new NextResponse(`Neynar API request failed with status: ${userResponse.status}`, {
        status: userResponse.status,
      });
    }

    const userData = await userResponse.json();
    console.log('User Data:', userData);

    const username = userData?.users?.[0]?.username;
    console.log('Username:', username);

    if (!username) {
      console.error('Username not found');
      return new NextResponse('Username not found', { status: 500 });
    }

    // Step 3: Execute Dune query with username
    const duneHeaders: HeadersInit = new Headers();
    duneHeaders.set('X-Dune-API-Key', duneApiKey);
    duneHeaders.set('Content-Type', 'application/json');

    const queryResponse = await fetch('https://api.dune.com/api/v1/query/3824077/execute', {
      method: 'POST',
      headers: duneHeaders,
      body: JSON.stringify({
        query_parameters: {
          'Your handle': username,
        },
        performance: 'medium',
      }),
    });

    const queryData = await queryResponse.json();
    console.log('Dune Query Response:', queryData);

    const executionId = queryData.execution_id;

    if (!executionId) {
      console.error('Failed to execute query');
      return new NextResponse('Failed to execute query', { status: 500 });
    }

    console.log('Execution ID:', executionId);
    console.log('Query State:', queryData.state);

    // Return a response with a refresh button
    return new NextResponse(
      getFrameHtmlResponse({
        buttons: [
          {
            action: 'link',
            label: 'Refresh',
            target: `${NEXT_PUBLIC_URL}/api/frame/refresh?execution_id=${executionId}`,
          },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/loading.png`,
          aspectRatio: '1:1',
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
      }),
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';
