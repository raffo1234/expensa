import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import UploadEmailUser from '@/components/UploadEmailUser';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, link } = body;
    
    const recipients = Array.isArray(to) ? to : [to];

    const data = await resend.emails.send({
      from: 'Cadia Medical <inform@cadia.pe>',
      to: recipients,
      subject: "Cadia: New Report Uploaded!",
      react: UploadEmailUser({ link }),
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}