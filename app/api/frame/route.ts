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

async function getResponse(body: FrameRequest): Promise<NextResponse> {
  try {
    console.log('Received body:', body);

    const { isValid, message } = await getFrameMessage(body, {
      neynarApiKey,
      allowFramegear: true, // true to allow debugging in framegear
    });

    console.log('Frame message validation:', isValid, message);

    if (!isValid) {
      console.error('Message not valid');
      return new NextResponse('Message not valid', { status: 500 });
    }

    // const fid = message.interactor.fid;
    const fid = 253746; // Hardcoded for debugging
    console.log('FID:', fid);

    // Step 2: Get the username from Neynar API
    const userHeaders: HeadersInit = new Headers();
    userHeaders.set('accept', 'application/json');
    userHeaders.set('api_key', neynarApiKey);

    const userResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: userHeaders,
    });

    console.log('Neynar API response status:', userResponse.status);

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

    console.log('Dune query response status:', queryResponse.status);

    const queryData = await queryResponse.json();
    console.log('Dune Query Data:', queryData);

    const userExecutionID = queryData.execution_id;
    console.log('User Execution ID:', userExecutionID);

    if (!userExecutionID) {
      console.error('Failed to execute query');
      return new NextResponse('Failed to execute query', { status: 500 });
    }

    // Move to the final state with updated image and button
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
    console.error('Error processing request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handling POST request to initiate the process
export async function POST(req: NextRequest): Promise<Response> {
  try {
    console.log('POST request received');
    const body = await req.json();
    console.log('POST request body:', body);

    return getResponse(body); // Directly handle the initial request and move to the final state
  } catch (error) {
    console.error('Error in POST request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
