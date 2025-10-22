// app/index.tsx
import { getToken } from '../lib/secure';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import KioskoLayout from './(components)/KioskoLayout';

export default function Home() {
  const router = useRouter();



  return <KioskoLayout />;
}
