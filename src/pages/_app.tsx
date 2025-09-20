import type { AppProps } from 'next/app';
import '../styles/globals.css'; // Solo esto

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}