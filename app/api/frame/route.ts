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
    console.log('Received body:', body);

    const { isValid, message } = await getFrameMessage(body, {
      neynarApiKey,
      // allowFramegear: true, // true to allow debugging in framegear
    });

    console.log('Frame message validation:', isValid, message);

    if (!isValid) {
      console.error('Message not valid');
      return new NextResponse('Message not valid', { status: 500 });
    }

    // const fid = 253746; // Hardcoded for debugging
    const fid = message.interactor.fid;
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

    const queryResponse = await fetch(
      `https://api.dune.com/api/v1/query/3835652/results?limit=1&filters=username='${'@' + username}'`,
      {
        method: 'GET',
        headers: duneHeaders,
      },
    );

    console.log('Dune query response status:', queryResponse.status);

    const resultsData = await queryResponse.json();
    console.log('Dune Query Results:', resultsData);

    // Extracting 'Total Tip Amount' value from the Dune API response
    const totalTips = resultsData.result?.rows?.[0]?.['Total Tip Amount'] || 0;
    console.log('Total Tips:', totalTips);

    // Generate dynamic HTML and CSS for the results
    const htmlContent = `
      <div class="results-container">
        <div class="username">@${username}</div>
        <div class="total-tips">${totalTips} $degen</div>
        <div class="footer">Your Daily Tips<br>frame by @cmplx.eth</div>
      </div>
    `;
    const cssContent = `
      .results-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background-color: #0b0c10;
        color: #66ff66;
        font-family: 'Menlo', monospace;
      }
      .username {
        font-size: 70pt;
        margin-bottom: 20px;
      }
      .total-tips {
        font-size: 60pt;
        color: #ff66ff;
        border: 5px solid #ff66ff;
        padding: 20px;
        margin-bottom: 20px;
      }
      .footer {
        font-size: 20pt;
        text-align: center;
      }
    `;

    // Move to the results page
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
          src: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><foreignObject width='100%' height='100%'><style>${cssContent}</style><body xmlns='http://www.w3.org/1999/xhtml'>${htmlContent}</body></foreignObject></svg>`,
          aspectRatio: '1:1',
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/frame`,
        state: { totalTips, username }, // Pass the total tips and username to the same page
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

    return handleInitialRequest(body); // Handle the initial request
  } catch (error) {
    console.error('Error in POST request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
