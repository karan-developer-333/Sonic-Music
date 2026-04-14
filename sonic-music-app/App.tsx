import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/application/store/store';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import Constants from 'expo-constants';
import { useAppSelector, useAppDispatch } from './src/application/store/hooks';
import { loginSuccess, loginFailure, setVerification } from './src/application/store/slices/authSlice';

function AppContent() {
  const mode = useAppSelector(state => state.theme.mode);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        const { hostname, path, queryParams } = parsed;
        
        console.log('Deep link received:', { hostname, path, queryParams });

        // Handle both sonic-music://auth-callback and sonic-music:///auth-callback
        const isAuthCallback = path === 'auth-callback' || hostname === 'auth-callback';
        
        if (isAuthCallback) {
          if (queryParams?.error) {
            dispatch(loginFailure(queryParams.error as string));
          } else if (queryParams?.accessToken || queryParams?.access_token) {
            dispatch(loginSuccess({
              accessToken: (queryParams.accessToken || queryParams.access_token) as string,
              refreshToken: (queryParams.refreshToken || queryParams.refresh_token) as string,
              expiresAt: parseInt(queryParams.expires_at as string || '0'),
              sessionId: queryParams.sessionId as string,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to parse deep link', err);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  const { isAuthenticated } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      const checkConnection = async () => {
        try {
          const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
          const response = await fetch(`${apiUrl}/auth/me`);
          const data = await response.json();
          
          if (data.authenticated) {
            dispatch(setVerification({ 
              isVerified: data.verified !== false, 
              error: data.reason === 'FORBIDDEN' ? 'SPOTIFY_RESTRICTED' : undefined 
            }));
          }
        } catch (error) {
           console.error('Initial connection check failed', error);
        }
      };
      checkConnection();
    }
  }, [isAuthenticated, dispatch]);

  return (
    <>
      <AppNavigator />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AppContent />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}