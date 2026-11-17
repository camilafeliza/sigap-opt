import { Component } from 'solid-js';
import { Router, Route, Navigate, useLocation } from '@solidjs/router';
import { useAuth } from './services/auth';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ToastContainer } from './components/ui/Toast';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Observasi from './pages/Observasi';
import Users from './pages/Users';
import AmbangEkonomi from './pages/AmbangEkonomi';

const Layout: Component<any> = (props) => {
  const location = useLocation();
  const isLogin = () => location.pathname === '/login';

  return (
    <div
      class={`min-h-screen flex flex-col items-center transition-colors duration-200 ${
        isLogin()
          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Mobile-first centered container: max-w-md on desktop */}
      <div
        class={`w-full max-w-md min-h-screen flex flex-col bg-white dark:bg-slate-900 transition-colors duration-200 ${
          isLogin()
            ? 'relative'
            : 'shadow-sm border-x border-slate-100 dark:border-slate-800 relative pb-24'
        }`}
      >
        <Header />
        <main class="flex-1 overflow-y-auto flex flex-col">
          {props.children}
        </main>
        <BottomNav />
        <ToastContainer />
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

      {/* Halaman Inti PHT (Strict 5 Routes - GEMINI.md SSOT) */}
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/observasi" component={Observasi} />
      <Route path="/users" component={Users} />
      <Route path="/ambang-ekonomi" component={AmbangEkonomi} />

      {/* Catch-all fallback */}
      <Route path="*404" component={() => <Navigate href="/login" />} />
    </Router>
  );
};

export default App;
