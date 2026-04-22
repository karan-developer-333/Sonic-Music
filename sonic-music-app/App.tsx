import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { store, persistor } from './src/application/store/store';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { useAppSelector } from './src/application/store/hooks';
import { restoreSession } from './src/application/store/slices/authSlice';
import AuthService from './src/data/services/AuthService';
import { QueueProvider } from './src/presentation/components/QueueProvider';

function AppContent() {
  const mode = useAppSelector(state => state.theme.mode);
  const { isAuthenticated, token } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (token && !isAuthenticated) {
      AuthService.getCurrentUser()
        .then(user => {
          store.dispatch(restoreSession({ token: token!, user }));
        })
        .catch(() => {
          AuthService.logout();
        });
    }
  }, [token, isAuthenticated]);

  return (
    <QueueProvider>
      <BottomSheetModalProvider>
        <AppNavigator />
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </BottomSheetModalProvider>
    </QueueProvider>
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
