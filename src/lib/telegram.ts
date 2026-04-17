import WebApp from '@twa-dev/sdk';

export const initTelegram = () => {
  WebApp.ready();
  WebApp.expand();
  
  // Apply theme classes to body
  const themeParams = (WebApp as any).themeParams || {};
  document.body.style.backgroundColor = (WebApp as any).backgroundColor || themeParams.bg_color;
  document.body.style.color = (WebApp as any).textColor || themeParams.text_color;
  
  return {
    user: WebApp.initDataUnsafe.user,
    platform: WebApp.platform,
    theme: WebApp.colorScheme,
    startParam: WebApp.initDataUnsafe.start_param,
  };
};

export const hapticFeedback = () => {
  WebApp.HapticFeedback.impactOccurred('medium');
};

export const showAlert = (message: string) => {
  WebApp.showAlert(message);
};

export const closeWebApp = () => {
  WebApp.close();
};
