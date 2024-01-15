import { toast } from 'react-toastify';

import { sessionManager } from '../../utils/SessionManager';

export function HomeView({ setView }: { setView: (view: string) => void }) {
  const onStartNewSession = async () => {
    try {
      await sessionManager.createSession();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong. Please try again later.'
      );
    }
  };

  return (
    <div className="container m-auto px-4 text-center">
      <h1 className="mt-8 text-3xl font-bold">MoaiTime Games</h1>
      <div className="my-12 text-4xl">Are you ready to experience something amazing?</div>
      <button
        type="button"
        className="rounded-3xl bg-emerald-400 px-8 py-4 text-3xl"
        onClick={onStartNewSession}
      >
        Start New Session
      </button>
      <div className="my-4">or</div>
      <button
        type="button"
        className="rounded-3xl bg-emerald-400 px-8 py-4 text-3xl"
        onClick={() => {
          setView('join-session');
        }}
      >
        Join Existing Session
      </button>
    </div>
  );
}
