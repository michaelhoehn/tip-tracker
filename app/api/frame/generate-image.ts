import { createCanvas } from 'canvas';
import { NextRequest, NextResponse } from 'next/server';

export async function generateImage(username: string, totalTips: number): Promise<Buffer> {
  const canvas = createCanvas(800, 800);
  const context = canvas.getContext('2d');

  // Fill background
  context.fillStyle = '#0b0c10';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw username
  context.font = 'bold 70pt Menlo';
  context.textAlign = 'center';
  context.fillStyle = '#66ff66';
  context.fillText(`@${username}`, canvas.width / 2, 150);

  // Draw total tips
  context.font = 'bold 60pt Menlo';
  context.fillStyle = '#ff66ff';
  context.strokeStyle = '#ff66ff';
  context.lineWidth = 10;
  const tipsText = `${totalTips} $degen`;
  const textWidth = context.measureText(tipsText).width;
  const x = (canvas.width - textWidth) / 2;
  context.strokeRect(x - 20, 200, textWidth + 40, 80);
  context.fillText(tipsText, canvas.width / 2, 280);

  // Draw additional text
  context.font = 'bold 40pt Menlo';
  context.fillStyle = '#66ff66';
  context.fillText(`Your Daily Tips`, canvas.width / 2, 450);
  context.font = '20pt Menlo';
  context.fillText(`frame by @cmplx.eth`, canvas.width / 2, 500);

  console.log('Image generated successfully');
  return canvas.toBuffer('image/png');
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const username = url.searchParams.get('username') || 'unknown';
  const totalTips = parseInt(url.searchParams.get('totalTips') || '0', 10);

  console.log(`Generating image for username: ${username}, totalTips: ${totalTips}`);
  const imageBuffer = await generateImage(username, totalTips);

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
}
