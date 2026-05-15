export function initLakeBrowserAPI({ iframeRef, setUrl }) {
  const post = (action, payload = {}) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ action, ...payload }, '*');
    }
  };

  return {
    open: (url) => {
      if (setUrl) setUrl(url);
      return new Promise((resolve) => {
        // Simular tiempo de espera para carga
        setTimeout(() => resolve(`Opened ${url}`), 1500);
      });
    },
    click: (selector) => {
      post('click', { selector });
      return Promise.resolve(`Clicked ${selector}`);
    },
    type: (selectorOrObj, text) => {
      let sel = selectorOrObj;
      let txt = text;
      // Soporte para llamar con un solo objeto (input de herramienta AI)
      if (typeof selectorOrObj === 'object' && selectorOrObj !== null) {
        sel = selectorOrObj.selector;
        txt = selectorOrObj.text;
      }
      post('type', { selector: sel, text: txt });
      return Promise.resolve(`Typed "${txt}" in ${sel}`);
    },
    read: (selector) => {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data && event.data.type === 'read_response') {
            window.removeEventListener('message', handler);
            resolve(event.data.content);
          }
        };
        window.addEventListener('message', handler);
        post('read', { selector });
        
        // Timeout de seguridad
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 5000);
      });
    },
    evaluate: (code) => {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data && event.data.type === 'eval_response') {
            window.removeEventListener('message', handler);
            resolve(event.data.result);
          }
        };
        window.addEventListener('message', handler);
        post('evaluate', { code });
        
        // Timeout de seguridad
        setTimeout(() => {
            window.removeEventListener('message', handler);
            resolve(null);
        }, 5000);
      });
    },
    scroll: (y) => {
      post('scroll', { y });
      return Promise.resolve(`Scrolled to ${y}`);
    },
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
  };
}