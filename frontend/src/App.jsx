import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/widgets/layout";
import { Toaster } from "react-hot-toast";
import routes from "@/routes";

function App() {
  const { pathname } = useLocation();

  const hideNavbar = pathname === "/sign-in" || pathname === "/sign-up";

  return (
    <>
      {/* Globalni toaster s pozicijo na sredini zgoraj */}
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

export default App;
