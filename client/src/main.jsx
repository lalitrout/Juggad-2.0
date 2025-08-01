import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './AuthContext';

const Root = () => {
  const [navigateFn, setNavigateFn] = useState(null);

  return (
    <AuthProvider navigateTo={navigateFn}>
      <App setNavigateFn={setNavigateFn} />
    </AuthProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
