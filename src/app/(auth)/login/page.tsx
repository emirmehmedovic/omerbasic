import { LoginForm } from './_components/LoginForm';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

const LoginPage = async () => {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
