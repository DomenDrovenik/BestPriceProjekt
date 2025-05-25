import React, { useState, useEffect } from 'react';
import { Typography, Button } from '@material-tailwind/react';
import { MapPinIcon, BriefcaseIcon, BuildingLibraryIcon } from '@heroicons/react/24/solid';
import { Footer, ProfileHeader, ProfileStats, ProfilePreferences, PriceAlerts, ShoppingLists } from '@/widgets/layout';
import { auth, firestore } from '../firebase.js';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function Profile() {
  const [profile, setProfile] = useState({ name: '', surname: '', email: '', photoURL: '' });
  const [favorites, setFavorites] = useState({ stores: [], categories: [] });
  const [stats, setStats] = useState({ totalSavings: 0, comparisons: 0, alertsTriggered: 0 });
  const [lists, setLists] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) return setLoading(false);
      const userRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          name: data.name || '',
          surname: data.surname || '',
          email: data.email || user.email,
          photoURL: data.photoURL || user.photoURL || ''
        });
        setFavorites({ stores: data.favoriteStores || [], categories: data.favoriteCategories || [] });
      } else {
        setProfile({ name: user.displayName || '', surname: '', email: user.email, photoURL: user.photoURL || '' });
      }
      const statsSnap = await getDoc(doc(firestore, 'users', user.uid, 'meta', 'stats'));
      if (statsSnap.exists()) setStats(statsSnap.data());
      const listsSnap = await getDocs(collection(firestore, 'users', user.uid, 'lists'));
      setLists(listsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const alertsSnap = await getDocs(collection(firestore, 'users', user.uid, 'priceAlerts'));
      setAlerts(alertsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Typography>Loading profile…</Typography></div>;
  }

  const fullName = `${profile.name} ${profile.surname}`.trim() || 'No Name';

  return (
    <>
      <section className="relative block h-[50vh]"><div className="absolute top-0 h-full w-full bg-[url('/img/background.jpg')] bg-cover bg-center scale-105"/><div className="absolute top-0 h-full w-full bg-black/60"/></section>
      <section className="relative bg-white py-16">
        <div className="container mx-auto px-4">
          <ProfileHeader fullName={fullName} email={profile.email} photoURL={profile.photoURL} />
          <ProfileStats totalSavings={stats.totalSavings} comparisons={stats.comparisons} alerts={stats.alertsTriggered} />
          <div className="mt-6 space-y-4">
            <ProfilePreferences stores={favorites.stores} categories={favorites.categories} />
            <PriceAlerts alerts={alerts} onEdit={() => alert('Edit alerts')} />
            <ShoppingLists lists={lists} onCreate={() => alert('Create list')} />
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default Profile;
