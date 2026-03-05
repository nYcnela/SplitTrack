"use client";

import { useState, useEffect } from "react";
import { setAppPassword } from "@/lib/auth";
import { Lock } from "lucide-react";

export function PasswordModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Open modal only when backend explicitly returns 401.
    const handleUnauthorized = () => {
      setOpen(true);
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setAppPassword(password.trim());
      setOpen(false);
      window.location.reload(); // Prosty sposób na przeładowanie i restart fetchów
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3 mb-4 text-stone-900 dark:text-white">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Wymagane hasło</h2>
        </div>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Ten serwer ma włączoną ochronę hasłem. Podaj hasło aplikacji, aby kontynuować.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło..."
            className="flex-1 px-4 py-2 border rounded-xl border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            Wejdź
          </button>
        </form>
      </div>
    </div>
  );
}
