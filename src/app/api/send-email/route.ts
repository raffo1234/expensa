import { Resend } from "resend";
import { NextResponse } from "next/server";
import ShareLinkEmail from "@/components/ShareLinkEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, link } = body;

    const recipients = Array.isArray(to) ? to : [to];

    const data = await resend.emails.send({
      from: "Cadia MRI <inform@cadia.cc>",
      to: recipients,
      subject: "Cadia: Your Report is Now Available",
      react: ShareLinkEmail({ link }),
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
