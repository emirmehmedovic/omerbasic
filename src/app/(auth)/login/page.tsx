import { LoginForm } from './_components/LoginForm';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

const LoginPage = async () => {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Prijavite se na svoj račun
          </h2>
        </div>
        <div className="rounded-md bg-white p-8 shadow-lg">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
