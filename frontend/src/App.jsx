// src/App.jsx
import React, { useEffect, useState } from "react";
import { SWRConfig, mutate } from "swr";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/widgets/layout";
import { Toaster } from "react-hot-toast";
import routes from "@/routes";

// Firebase uvoz
import { auth } from "@/firebase";               // pot do vaše inicializacije
import { onAuthStateChanged } from "firebase/auth";

// Globalni fetcher za SWR
const fetcher = (url) => fetch(url).then((res) => res.json());

function AppContent({ user }) {
  const { pathname } = useLocation();
  const hideNavbar = pathname === "/sign-in" || pathname === "/sign-up";

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#f1f1f1",
            color: "#333",
            border: "1px solid #ccc",
            fontSize: "14px",
            padding: "12px 20px",
            borderRadius: "8px",
          },
        }}
      />

      {!hideNavbar && (
        <div className="container absolute left-2/4 z-10 mx-auto -translate-x-2/4 p-4">
          <Navbar routes={routes} currentUser={user} />
        </div>
      )}

      <Routes>
        {routes.map(({ path, element }, key) =>
          element ? <Route key={key} exact path={path} element={element} /> : null
        )}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Naročimo se na spremembe avtentikacije
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    // Razveljavi naročilo ob unmount
    return () => unsubscribe();
  }, [initializing]);

  useEffect(() => {
    // Prefetchanje ključnih endpointov
    mutate("http://localhost:3000/api/basket/basic", fetcher("http://localhost:3000/api/basket/basic"), false);
    mutate("http://localhost:3000/api/basket/extended", fetcher("http://localhost:3000/api/basket/extended"), false);
    mutate("http://localhost:3000/api/dashboard/average-prices", fetcher("http://localhost:3000/api/dashboard/average-prices"), false);
    mutate("http://localhost:3000/api/dashboard/price-trends", fetcher("http://localhost:3000/api/dashboard/price-trends"), false);
    mutate("https://bestpriceprojekt-production.up.railway.app/api/all-products", fetcher("https://bestpriceprojekt-production.up.railway.app/api/all-products"), false);
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 60000,
        revalidateOnFocus: false,
      }}
    >
      <AppContent user={user} />
    </SWRConfig>
  );
}