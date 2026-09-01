import { redirect } from 'next/navigation';
import { isAllowedAccessEmail } from '@/lib/access-control';
import { ensureUserProfile, getSessionUser } from '@/lib/auth-user';

export async function requirePageUser() {
  const { authClient, user } = await getSessionUser();

  if (!user) redirect('/login');

  if (!isAllowedAccessEmail(user.email)) {
    await authClient.auth.signOut();
    redirect('/login?access=denied');
  }

  await ensureUserProfile(user);
  return user;
}
