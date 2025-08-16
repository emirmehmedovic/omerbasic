import { RegisterForm } from './_components/RegisterForm';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

const RegisterPage = async () => {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Kreirajte novi račun
          </h2>
        </div>
        <div className="rounded-md bg-white p-8 shadow-lg">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
