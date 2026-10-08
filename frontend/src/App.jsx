// src/App.jsx
import React, { useEffect, useState } from "react";
import { SWRConfig, mutate } from "swr";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/widgets/layout";
import { Toaster } from "react-hot-toast";
import routes from "@/routes";

const API_URL = import.meta.env.VITE_API_URL;

// Firebase uvoz
import { auth } from "@/firebase";               // pot do vaše inicializacije
import { onAuthStateChanged } from "firebase/auth";

console.log("API_URL =", API_URL);

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
    mutate(
      `${API_URL}/api/basket/basic`,
      fetcher(`${API_URL}/api/basket/basic`),
      false
    );
  
    mutate(
      `${API_URL}/api/basket/extended`,
      fetcher(`${API_URL}/api/basket/extended`),
      false
    );
  
    mutate(
      `${API_URL}/api/dashboard/average-prices`,
      fetcher(`${API_URL}/api/dashboard/average-prices`),
      false
    );
  
    mutate(
      `${API_URL}/api/dashboard/price-trends`,
      fetcher(`${API_URL}/api/dashboard/price-trends`),
      false
    );
  
    mutate(
      `${API_URL}/api/all-products`,
      fetcher(`${API_URL}/api/all-products`),
      false
    );
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