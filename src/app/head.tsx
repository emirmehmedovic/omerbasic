export default function Head() {
  return (
    <>
      {/* Explicit favicon links to override default Next.js icon */}
      <link rel="icon" type="image/png" sizes="32x32" href="/images/omerbasic.png?v=3" />
      <link rel="icon" type="image/png" sizes="192x192" href="/images/omerbasic.png?v=3" />
      <link rel="shortcut icon" type="image/png" href="/images/omerbasic.png?v=3" />
      <link rel="icon" type="image/png" sizes="512x512" href="/images/omerbasic.png?v=3" />
      <link rel="apple-touch-icon" sizes="180x180" href="/images/omerbasic.png?v=3" />
    </>
  );
}
