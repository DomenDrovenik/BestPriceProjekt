import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Footer, ProfileHeader, ProfileStats, ProfilePreferences, PriceAlerts, ShoppingLists } from '@/widgets/layout';
import { auth, firestore } from '../firebase.js';
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Button
} from "@material-tailwind/react";

export function Profile() {
  const [profile, setProfile] = useState({ name: '', surname: '', email: '', photoURL: '' });
  const [favorites, setFavorites] = useState({ stores: [], categories: [] });
  const [stats, setStats] = useState({ totalSavings: 0, comparisons: 0, alertsTriggered: 0 });
  const [lists, setLists] = useState([]);
  const [alerts, setAlerts] = useState([]);
  //const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", surname: "" });

  useEffect(() => {
    
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            //setLoading(false);
            return;
          }
      
      const userRef   = doc(firestore, 'users', user.uid);
      const statsRef  = doc(firestore, 'users', user.uid, 'meta', 'stats');
      const listsCol  = collection(firestore, 'users', user.uid, 'lists');
      const alertsCol = collection(firestore, 'users', user.uid, 'priceAlerts');

      try {
        const [snap, statsSnap, listsSnap, alertsSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(statsRef),
          getDocs(listsCol),
          getDocs(alertsCol),
        ]);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name || '',
            surname: data.surname || '',
            email: data.email || user.email,
            photoURL: data.photoURL || user.photoURL || '',
          });
          setFavorites({
            stores: data.favoriteStores || [],
            categories: data.favoriteCategories || [],
          });
        } else {
          setProfile({
            name: user.displayName || '',
            surname: '',
            email: user.email,
            photoURL: user.photoURL || '',
          });
        }

        if (statsSnap.exists()) {
          setStats(statsSnap.data());
        }

        setLists(listsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAlerts(alertsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Napaka pri nalaganju uporabniških podatkov:", error);
      /*} finally {
        setLoading(false);*/
      }
    });
    return unsubscribe;
  }, []);

  

  

  const handleRemove = async (alertId) => {
    const user = auth.currentUser;
    await deleteDoc(doc(firestore, "users", user.uid, "priceAlerts", alertId));
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };
  
  const handleReset = async (alertId) => {
    const user = auth.currentUser;
    const ref = doc(firestore, "users", user.uid, "priceAlerts", alertId);
    await updateDoc(ref, { triggered: false, triggeredAt: null, notified:false, notifiedAt:null, seen:false });
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, triggered: false, triggeredAt: null, notified:false, notifiedAt:null, seen:false } : a)
    );
  };

  const handleUpdate = async (alertId, newPrice, emailNotification) => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(firestore, "users", user.uid, "priceAlerts", alertId);
    await updateDoc(ref, { targetPrice: newPrice ,emailNotification});
    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId ? { ...a, targetPrice: newPrice,emailNotification} : a
      )
    );
  };

  const handleMarkAsSeen = async (alertId) => {
  const user = auth.currentUser;
  const ref = doc(firestore, "users", user.uid, "priceAlerts", alertId);
  await updateDoc(ref, { seen: true });

  setAlerts(prev =>
    prev.map(a => a.id === alertId ? { ...a, seen: true } : a)
  );
};




  const fullName = `${profile.name} ${profile.surname}`.trim() || 'No Name';

  const pageTitle = `Profil uporabnika – Primerjava cen`;
  const pageDescription = `Preglej nastavitve, sezname in obvestila o cenah za uporabnika.`;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';


  return (
    <>
    <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={currentUrl} />
      </Helmet>

      <section className="relative block h-[50vh]"><div className="absolute top-0 h-full w-full bg-[url('/img/background.jpg')] bg-cover bg-center scale-105"/><div className="absolute top-0 h-full w-full bg-black/60"/></section>
      <section className="relative bg-white py-16">
        <div className="container mx-auto px-4">
        <ProfileHeader
          fullName={fullName}
          email={profile.email}
          photoURL={profile.photoURL}
          onConnect={() => {
            setEditData({ name: profile.name, surname: profile.surname, photoURL: profile.photoURL });
            setEditOpen(true);
          }}
        />
          <div className="mt-6 space-y-4">
            <PriceAlerts
        alerts={alerts}
        onRemove={handleRemove}
        onReset={handleReset}
        onUpdate={handleUpdate}
        onSeen={handleMarkAsSeen}
      />

            <ShoppingLists lists={lists} onCreate={() => alert('Create list')} />
          </div>
        </div>
      </section>
      <Footer />
      <Dialog open={editOpen} handler={() => setEditOpen(false)} size="sm">
      <DialogHeader>Uredi profil</DialogHeader>
       <DialogBody className="space-y-4">
        <Input
          label="Ime"
          value={editData.name}
          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
        />
        <Input
          label="Priimek"
          value={editData.surname}
          onChange={(e) => setEditData({ ...editData, surname: e.target.value })}
        />
      </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={() => setEditOpen(false)}>
            Prekliči
          </Button>
          <Button
        color="blue"
        onClick={async () => {
          const user = auth.currentUser;
          if (!user) return;
          await updateDoc(doc(firestore, "users", user.uid), {
            name: editData.name,
            surname: editData.surname,
          });
          setProfile(prev => ({
            ...prev,
            name: editData.name,
            surname: editData.surname,
          }));
          setEditOpen(false);
        }}
      >
        Shrani
      </Button>
  </DialogFooter>
</Dialog>

    </>
  );
}

export default Profile;
