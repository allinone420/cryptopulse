import WebApp from '@twa-dev/sdk';

export const initTelegram = () => {
  try {
    // 1. Check window.Telegram.WebApp directly (official client bridge)
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      if (typeof tg.ready === 'function') tg.ready();
      if (typeof tg.expand === 'function') tg.expand();
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#0f1218');
      if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#0f1218');
      if (typeof tg.enableClosingConfirmation === 'function') tg.enableClosingConfirmation();
    }

    // 2. Check @twa-dev/sdk
    if (typeof WebApp !== 'undefined') {
      if (typeof WebApp.ready === 'function') {
        WebApp.ready();
      }
      if (typeof WebApp.expand === 'function') {
        WebApp.expand();
      }
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
