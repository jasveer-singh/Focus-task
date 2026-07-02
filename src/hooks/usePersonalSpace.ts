"use client";

import { useCallback, useEffect, useState } from "react";

const SESSION_KEY = "suru-personal-unlocked";
const CRED_KEY = "suru-webauthn-credId";

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function usePersonalSpace() {
  const [unlocked, setUnlocked] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { id: window.location.hostname, name: "Suru" },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "personal",
            displayName: "Personal Space",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      localStorage.setItem(CRED_KEY, b64(cred.rawId));
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    const stored = localStorage.getItem(CRED_KEY);
    if (!stored) return register();

    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ type: "public-key", id: unb64(stored), transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      return true;
    } catch {
      return false;
    }
  }, [supported, register]);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }, []);

  return { unlocked, supported, unlock, lock };
}
