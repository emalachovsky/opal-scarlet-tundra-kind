import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import markup from "../offer/markup.html?raw";

export const Route = createFileRoute("/")({ component: Home });

const LIBS = [
  "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.body.appendChild(s);
  });
}

function Home() {
  useEffect(() => {
    const w = window as Window & { __offerBoot?: boolean };
    if (w.__offerBoot) return;
    w.__offerBoot = true;
    void (async () => {
      for (const src of LIBS) {
        try {
          await loadScript(src);
        } catch (err) {
          console.error(err);
        }
      }
      try {
        await loadScript("/offer.js");
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  return <div className="offer-root" dangerouslySetInnerHTML={{ __html: markup }} />;
}
