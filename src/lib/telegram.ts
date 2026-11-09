import WebApp from '@twa-dev/sdk';

export const initTelegram = () => {
  try {
    if (typeof WebApp !== 'undefined') {
      if (typeof WebApp.ready === 'function') {
        WebApp.ready();
      }
      if (typeof WebApp.expand === 'function') {
        WebApp.expand();
      }

      // Hamster Kombat style seamless header
      if (typeof (WebApp as any).setHeaderColor === 'function') {
        (WebApp as any).setHeaderColor('#0f1218'); 
      }
      if (typeof (WebApp as any).setBackgroundColor === 'function') {
        (WebApp as any).setBackgroundColor('#0f1218');
      }

      if (typeof (WebApp as any).enableClosingConfirmation === 'function') {
        (WebApp as any).enableClosingConfirmation();
      }
    }
  } catch (e) {
    console.warn('Telegram WebApp SDK init notice:', e);
  }
};

export const hapticFeedback = () => {
  try {
    if (WebApp?.HapticFeedback && typeof WebApp.HapticFeedback.impactOccurred === 'function') {
      WebApp.HapticFeedback.impactOccurred('medium');
    }
  } catch (e) {}
};

export const hapticNotification = (type: 'error' | 'success' | 'warning' = 'success') => {
  try {
    if (WebApp?.HapticFeedback && typeof WebApp.HapticFeedback.notificationOccurred === 'function') {
      WebApp.HapticFeedback.notificationOccurred(type);
    }
  } catch (e) {}
};

export const showAlert = (message: string) => {
  try {
    if (WebApp && typeof WebApp.showAlert === 'function') {
      WebApp.showAlert(message);
    } else {
      window.alert(message);
    }
  } catch (e) {
    window.alert(message);
  }
};

export const closeWebApp = () => {
  try {
    if (WebApp && typeof WebApp.close === 'function') {
      WebApp.close();
    }
  } catch (e) {}
};
