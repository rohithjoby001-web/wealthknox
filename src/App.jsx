import { useState } from 'react';
import { useApp } from './state/AppContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import SheetRoot from './sheets/SheetRoot.jsx';
import InstallBanner from './pwa/InstallBanner.jsx';
import Splash from './splash/Splash.jsx';
import Overview from './pages/Overview.jsx';
import Reports from './pages/Reports.jsx';
import Expenses from './pages/Expenses.jsx';
import Income from './pages/Income.jsx';
import Goals from './pages/Goals.jsx';

const PAGES = {
  overview: Overview,
  reports: Reports,
  expenses: Expenses,
  income: Income,
  goals: Goals,
};

export default function App() {
  const { state } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const Page = PAGES[state.tab] || Overview;

  return (
    <div className="page-frame">
      <div className="app">
        {showSplash ? <Splash onDone={() => setShowSplash(false)} /> : null}
        <main className="scroll" key={state.tab}>
          <Page />
        </main>
        <BottomNav />
        <InstallBanner />
        <SheetRoot />
        <Toast />
      </div>
    </div>
  );
}
