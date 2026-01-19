'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  nomeGuerra: string;
  posto: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserData | null;
  userRole: 'user' | 'admin';
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    nomeGuerra: string,
    posto: string
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (firebaseUser) {
          const ref = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(ref);

          if (userDoc.exists()) {
            const data = userDoc.data() as Omit<UserData, 'uid' | 'email'>;

            const userData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              nomeGuerra: data.nomeGuerra ?? '',
              posto: data.posto ?? '',
              role: data.role ?? 'user',
            };

            setUser(userData);
            setUserRole(userData.role);
          } else {
            const userData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              nomeGuerra: '',
              posto: '',
              role: 'user',
            };

            setUser(userData);
            setUserRole('user');
          }
        } else {
          setUser(null);
          setUserRole('user');
        }
      } catch (err) {
        console.error('Erro no onAuthStateChanged ao ler Firestore:', err);
        setUser(null);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    nomeGuerra: string,
    posto: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        nomeGuerra,
        posto,
        role: 'user',
        createdAt: Date.now(),
      });

      return { success: true };
    } catch (error: any) {
      let message = 'Erro ao criar conta';

      if (error.code === 'auth/email-already-in-use') message = 'Este email já está em uso';
      else if (error.code === 'auth/invalid-email') message = 'Email inválido';
      else if (error.code === 'auth/weak-password') message = 'A senha deve ter pelo menos 6 caracteres';

      return { success: false, error: message };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      let message = 'Erro ao fazer login';

      if (error.code === 'auth/user-not-found') message = 'Usuário não encontrado';
      else if (error.code === 'auth/wrong-password') message = 'Senha incorreta';
      else if (error.code === 'auth/invalid-email') message = 'Email inválido';
      else if (error.code === 'auth/invalid-credential') message = 'Credenciais inválidas';

      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserRole('user');
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};