export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID ||
  '4243537145934095';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const fbEvent = (event: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params);
  }
};
