import WebApp from '@twa-dev/sdk';

export const initTelegram = () => {
  try {
    WebApp.ready();
    WebApp.expand();
    
    // Force header color to match our app background for a seamless look
    // Using the theme variable ensures color synchronization
    try {
      if (WebApp.setHeaderColor) WebApp.setHeaderColor('#0f1218');
      if (WebApp.setBackgroundColor) WebApp.setBackgroundColor('#0f1218');
    } catch (e) {}

    // Optional: Ask before closing to avoid accidental exit
    WebApp.enableClosingConfirmation();
    
    // Apply theme classes to body
    const themeParams = (WebApp as any).themeParams || {};
    const bgColor = (WebApp as any).backgroundColor || themeParams.bg_color;
    const textColor = (WebApp as any).textColor || themeParams.text_color;
    
    if (bgColor) document.body.style.backgroundColor = bgColor;
    if (textColor) document.body.style.color = textColor;
  } catch (e) {
    console.warn('Telegram WebApp SDK not initialized or running outside Telegram');
  }
  
  return {
    user: WebApp?.initDataUnsafe?.user,
    platform: WebApp?.platform || 'web',
    theme: WebApp?.colorScheme || 'light',
    startParam: WebApp?.initDataUnsafe?.start_param,
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
