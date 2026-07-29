import { redirect } from 'next/navigation';

export default function HelpRedirect() {
  redirect('/settings?section=help');
}
