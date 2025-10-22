// app/index.tsx
import { getToken } from '../lib/secure';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import KioskoLayout from './(components)/KioskoLayout';
import { User } from 'lucide-react-native';
import UserCheckin from './(components)/UserCheckin';

export default function Page() {
  const router = useRouter();


  return <UserCheckin />;
}
