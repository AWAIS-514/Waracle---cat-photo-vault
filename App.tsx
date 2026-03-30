import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CatListScreen from './src/screens/CatListScreen';
import UploadScreen from './src/screens/UploadScreen';

import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7f8" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#f4f7f8' },
            headerShadowVisible: false,
            headerTintColor: '#101518',
            contentStyle: { backgroundColor: '#f4f7f8' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={CatListScreen}
            options={{ title: 'Cat Gallery' }}
          />
          <Stack.Screen
            name="Upload"
            component={UploadScreen}
            options={{ title: 'Upload' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
