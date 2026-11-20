import { useAuth } from './AuthContext.jsx';
import AuthScreen from './AuthScreen.jsx';
import { SplashArt, SplashContent } from '../splash/Splash.jsx';

// Sits between AuthProvider and the rest of the app. With no Firebase
// project configured, `enabled` is false and this renders straight
// through — the app behaves exactly as it always has. With one
// configured, it holds the app back behind a sign-in screen until
// there's an actual signed-in user, so AppProvider only ever mounts
// once it's clear which mode (and, in cloud mode, which account) it
// should be syncing.
export default function AuthGate({ children }) {
  const { enabled, user, loading } = useAuth();

  if (enabled && loading) {
    // Reuses the exact same art/title/tagline as the app's own post-auth
    // Splash (just without its progress bar, since this wait has no fixed
    // duration) — so checking auth state doesn't flash a plain, unbranded
    // screen before the real splash appears a moment later. One continuous
    // branded screen instead of two different-looking ones back to back.
    return (
      <div className="splash">
        <SplashArt />
        <SplashContent />
      </div>
    );
  }
  if (enabled && !user) return <AuthScreen />;
  return children;
}
