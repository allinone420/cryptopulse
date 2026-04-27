export {};

declare global {
  interface Window {
    show_10932949: {
      (options?: 'pop' | { type: string; inAppSettings: any }): Promise<void>;
    };
  }
  const show_10932949: {
    (options?: 'pop' | { type: string; inAppSettings: any }): Promise<void>;
  };
}
