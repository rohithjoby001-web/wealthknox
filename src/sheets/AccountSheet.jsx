import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const initial = (email) => (email || '?').trim().charAt(0).toUpperCase() || '?';

export default function AccountSheet() {
  const { closeSheet, openSheet } = useApp();
  const { user, signOutUser } = useAuth();

  const askSignOut = () => {
    openSheet({
      kind: 'confirm',
      title: 'Sign out?',
      text: "You'll need your email and password to sign back in. Your data stays safely in your account.",
      confirmLabel: 'Sign out',
      onConfirm: signOutUser,
    });
  };

  return (
    <Sheet title="Account" onClose={closeSheet}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0 26px' }}>
        <div className="avatar avatar-account avatar-lg">
          {user?.photoURL ? <img src={user.photoURL} alt="" /> : <span className="avatar-initial">{initial(user?.email)}</span>}
        </div>
        <p style={{ fontWeight: 700, fontSize: 15.5 }}>{user?.email}</p>
      </div>
      <button className="btn danger" onClick={askSignOut}>
        <Icon name="logout" size={17} stroke={2} />Sign out
      </button>
    </Sheet>
  );
}
