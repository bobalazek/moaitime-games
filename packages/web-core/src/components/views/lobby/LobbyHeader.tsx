import { useSessionStore } from '../../../state/sessionStore';

export function LobbyHeader() {
  const { session } = useSessionStore();
  if (!session) {
    return null;
  }

  const accessCode = session.accessCode.replace(/(.{3})/g, '$1 ').trim();

  return (
    <header className="flex items-center justify-between bg-slate-700 p-4 text-center text-2xl">
      <div className="flex gap-4">
        <img src="/assets/moaitime_logo.png" alt="Logo" className="h-8 w-8" /> MoaiTime Games
      </div>
      <div className="font-bold text-emerald-400">{accessCode}</div>
    </header>
  );
}
