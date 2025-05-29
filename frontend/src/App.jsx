// src/App.jsx
import React, { useEffect } from "react";
import { SWRConfig, mutate } from "swr";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/widgets/layout";
import { Toaster } from "react-hot-toast";
import routes from "@/routes";

// Globalni fetcher za SWR
const fetcher = (url) => fetch(url).then((res) => res.json());

function AppContent() {
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
          <Navbar routes={routes} />
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
  useEffect(() => {
    // Prefetch endpointov za osnovno in razširjeno košarico
    mutate("http://localhost:3000/api/basket/basic", fetcher("http://localhost:3000/api/basket/basic"), false);
    mutate("http://localhost:3000/api/basket/extended", fetcher("http://localhost:3000/api/basket/extended"), false);
    mutate("http://localhost:3000/api/dashboard/average-prices", fetcher("http://localhost:3000/api/dashboard/average-prices"), false);
    mutate("http://localhost:3000/api/dashboard/price-trends", fetcher("http://localhost:3000/api/dashboard/price-trends"), false);
    mutate("http://localhost:3000/api/all-products", fetcher("http://localhost:3000/api/all-products"), false);
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 60000,
        revalidateOnFocus: false,
      }}
    >
      <AppContent />
    </SWRConfig>
  );
}
