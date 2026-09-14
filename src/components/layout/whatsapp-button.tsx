import { MessageCircle } from "lucide-react";
import { publicEnv } from "@/lib/env/public";

export function WhatsAppButton() {
  const digits = publicEnv.whatsappNumber.replace(/[^\d]/g, "");
  const message = encodeURIComponent("Hi Pick Up, I need help with my order.");

  return (
    <a
      href={`https://wa.me/${digits}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Pick Up support on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lifted transition-transform hover:scale-105 md:bottom-6"
      style={{ height: 52, width: 52 }}
    >
      <MessageCircle className="h-6 w-6" aria-hidden fill="currentColor" />
    </a>
  );
}
