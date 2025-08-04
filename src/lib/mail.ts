import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Resetovanje lozinke za Vaš nalog',
    html: `
      <h1>Zatražili ste resetovanje lozinke</h1>
      <p>Kliknite na link ispod da biste postavili novu lozinku:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Ako niste Vi zatražili ovu promjenu, molimo Vas da ignorišete ovaj email.</p>
      <p>Link ističe za 1 sat.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email za resetovanje lozinke je poslan na:', email);
  } catch (error) {
    console.error('Greška prilikom slanja emaila:', error);
    throw new Error('Nije moguće poslati email za resetovanje lozinke.');
  }
};

// Potrebno je dodati NEXT_PUBLIC_APP_URL u .env datoteku, npr. NEXT_PUBLIC_APP_URL=http://localhost:3000
