import WebApp from '@twa-dev/sdk';

export const initTelegram = () => {
  try {
    WebApp.ready();
    WebApp.expand();
    
    // Hamster Kombat style seamless header
    // Use 'bg_color' or specific hex to remove the blue/gray bar
    if ((WebApp as any).setHeaderColor) {
      (WebApp as any).setHeaderColor('#0f1218'); 
    }
    if ((WebApp as any).setBackgroundColor) {
      (WebApp as any).setBackgroundColor('#0f1218');
    }

    WebApp.enableClosingConfirmation();
  } catch (e) {
    console.warn('Telegram WebApp SDK not initialized');
  }
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
