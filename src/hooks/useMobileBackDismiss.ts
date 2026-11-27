'use client';

import { useEffect, useRef } from 'react';

/**
 * Pushes a lightweight sentinel entry onto `window.history` when a mobile drawer/modal/lightbox opens,
 * so pressing Android Back or swiping back from the screen edge closes the overlay instead of
 * exiting the website. Preserves existing Vinext history state keys so client navigation stays intact.
 */
export function useMobileBackDismiss(
  isOpen: boolean,
  onClose: () => void,
  overlayKey: string,
) {
  const onCloseRef = useRef(onClose);
  const pushedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const token = `${overlayKey}:${Date.now()}`;
    pushedTokenRef.current = token;

    try {
      const currentState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.pushState(
        { ...currentState, __citilapOverlay: token },
        '',
        window.location.href,
      );
    } catch {
      pushedTokenRef.current = null;
      return;
    }

    const handlePopState = () => {
      const stateToken =
        window.history.state && typeof window.history.state === 'object'
          ? (window.history.state as { __citilapOverlay?: string }).__citilapOverlay
          : undefined;
      if (pushedTokenRef.current && stateToken !== pushedTokenRef.current) {
        pushedTokenRef.current = null;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      const tokenToClean = pushedTokenRef.current;
      pushedTokenRef.current = null;
      if (!tokenToClean) return;

      // Only pop our sentinel entry if the user closed via button/backdrop and didn't navigate away
      const currentToken =
        window.history.state && typeof window.history.state === 'object'
          ? (window.history.state as { __citilapOverlay?: string }).__citilapOverlay
          : undefined;
      if (currentToken === tokenToClean) {
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, overlayKey]);
}
