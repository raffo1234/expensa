import { supabase } from '@/lib/supabase';
import { SharedLinkType } from '@/types/sharedLinkType';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data, error } = (await supabase
      .from('shared_link')
      .delete()
      .lt('expire_at', now)) as { data: SharedLinkType[] | null; error: Error | null };

    if (error) {
      console.error('Error deleting expired links:', error);
      return NextResponse.json({ error: 'Failed to delete expired links' }, { status: 500 });
    }

    return NextResponse.json({ message: `Successfully deleted ${data?.length || 0} expired links.` }, { status: 200 });
  } catch {
    console.error('An unexpected error occurred:');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}