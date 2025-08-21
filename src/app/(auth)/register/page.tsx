import { redirect } from 'next/navigation';

const RegisterPage = async () => {
  // Javna registracija onemogućena
  redirect('/login');
};

export default RegisterPage;
