import { Component } from 'solid-js';
import { Router, Route, Navigate } from '@solidjs/router';
import { useAuth } from './services/auth';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Observasi from './pages/Observasi';
import Users from './pages/Users';
import AmbangEkonomi from './pages/AmbangEkonomi';
import Pengaturan from './pages/Pengaturan';

const Layout: Component<any> = (props) => {
  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center transition-colors duration-200">
      {/* Mobile-first centered container: max-w-md on desktop */}
      <div class="w-full max-w-md min-h-screen flex flex-col bg-white dark:bg-slate-900 shadow-sm border-x border-slate-100 dark:border-slate-800 relative pb-24 transition-colors duration-200">
        <Header />
        <main class="flex-1 overflow-y-auto">
          {props.children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export const App: Component = () => {
  const auth = useAuth();

  return (
    <Router root={Layout}>
      {/* Fallback root redirects */}
      <Route
        path="/"
        component={() => (
          <Navigate href={auth.isAuthenticated() ? '/dashboard' : '/login'} />
        )}
      />

      {/* Halaman Inti PHT */}
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/observasi" component={Observasi} />
      <Route path="/users" component={Users} />
      <Route path="/ambang-ekonomi" component={AmbangEkonomi} />
      <Route path="/pengaturan" component={Pengaturan} />

      {/* Catch-all fallback */}
      <Route path="*404" component={() => <Navigate href="/login" />} />
    </Router>
  );
};

export default App;
