// src/widgets/layout/Navbar.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import {
  Navbar as MTNavbar,
  MobileNav,
  Typography,
  Button,
  IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { UserIcon } from "@heroicons/react/24/outline";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase.js"; // adjust path
import { doc, getDocs, collection, onSnapshot } from "firebase/firestore";
import { firestore } from "../../firebase.js";

// your avatar component
function UserAvatar({ photoURL, alt, onClick }) {
  return (
    <div
      onClick={onClick}
      className="
        w-10 h-10 rounded-full
        bg-white text-gray-500
        border-2 border-white
        overflow-hidden
        flex items-center justify-center
        cursor-pointer
      "
    >
      {photoURL ? (
        <img src={photoURL} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <UserIcon className="w-6 h-6" />
      )}
    </div>
  );
}

export function Navbar({ brandName, routes, action }) {
  const [openNav, setOpenNav] = useState(false);
  const [user, setUser]     = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggeredCount, setTriggeredCount] = useState(0);
  const navigate = useNavigate();

  // useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (u) => {
    setUser(u);

    let alertsUnsubscribe = null;

    if (u) {
      const alertsRef = collection(firestore, "users", u.uid, "priceAlerts");
      alertsUnsubscribe = onSnapshot(alertsRef, (snapshot) => {
        const alerts = snapshot.docs.map((doc) => doc.data());
        const triggered = alerts.filter((a) => a.triggered && !a.seen).length;
        setTriggeredCount(triggered);
      });
    }

    return () => {
      if (alertsUnsubscribe) alertsUnsubscribe();
    };
  });

  return unsubscribe;
}, []);

  useEffect(() => {
    const onResize = () => window.innerWidth >= 960 && setOpenNav(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const navList = (
    <ul className="mb-4 mt-2 flex flex-col gap-2 text-inherit lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
      {routes.map(({ name, path, icon, href, target }) => (
        <Typography
          key={name}
          as="li"
          variant="h5"
          color="inherit"
          className="capitalize"
        >
          {href ? (
            <a
              href={href}
              target={target}
              className="flex items-center gap-1 p-1 font-bold"
            >
              {icon && React.createElement(icon, { className: "w-[18px] h-[18px] opacity-75 mr-1" })}
              {name}
            </a>
          ) : (
            <Link
              to={path}
              target={target}
              className="flex items-center gap-1 p-1 font-bold"
            >
              {icon && React.createElement(icon, { className: "w-[18px] h-[18px] opacity-75 mr-1" })}
              {name}
            </Link>
          )}
        </Typography>
      ))}
    </ul>
  );

  return (
    <MTNavbar color="transparent" className="p-3">
      <div className="container mx-auto flex items-center justify-between text-white">
        <Link to="/">
          <Typography className="mr-4 ml-2 cursor-pointer py-1.5 font-bold">
            {brandName}
          </Typography>
        </Link>

        <div className="hidden lg:block">{navList}</div>

        <div className="hidden gap-2 items-center lg:flex">
          {user ? (
            // <-- custom dropdown
            <div className="relative">
              <div className="relative">
  <UserAvatar
    photoURL={user.photoURL}
    alt={user.displayName || "User"}
    onClick={() => setMenuOpen((o) => !o)}
  />
  {triggeredCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
      {triggeredCount}
    </span>
  )}
</div>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Odjava
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/sign-in">
                <Button variant="text" size="sm" color="white">
                  Prijava
                </Button>
              </Link>
              {React.cloneElement(action, {
                className: "hidden lg:inline-block",
              })}
            </>
          )}
        </div>

        <IconButton
          variant="text"
          size="sm"
          color="white"
          className="ml-auto text-inherit hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden"
          onClick={() => setOpenNav((o) => !o)}
        >
          {openNav ? (
            <XMarkIcon strokeWidth={2} className="h-6 w-6" />
          ) : (
            <Bars3Icon strokeWidth={2} className="h-6 w-6" />
          )}
        </IconButton>
      </div>

      <MobileNav
        className="rounded-xl bg-white px-4 pt-2 pb-4 text-blue-gray-900"
        open={openNav}
      >
        <div className="container mx-auto">
          {navList}

          {user ? (
            <div className="flex items-center gap-4 mt-4">
              <UserAvatar
                photoURL={user.photoURL}
                alt={user.displayName || "User"}
                onClick={() => {}}
              />
              <div className="flex flex-col">
                <Button
                  variant="text"
                  onClick={() => navigate("/profile")}
                  className="justify-start"
                >
                  Profil
                </Button>
                <Button
                  variant="text"
                  onClick={handleLogout}
                  className="justify-start"
                >
                  Odjava
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/sign-in">
                <Button variant="text" size="sm" color="black" fullWidth>
                  Prijava
                </Button>
              </Link>
              {React.cloneElement(action, {
                className: "w-full block mt-2",
              })}
            </>
          )}
        </div>
      </MobileNav>
    </MTNavbar>
  );
}

Navbar.defaultProps = {
  brandName: "BestPrice",
  action: (
    <Link to="/sign-up">
      <Button variant="gradient" size="sm" fullWidth>
        Registracija
      </Button>
    </Link>
  ),
};

Navbar.propTypes = {
  brandName: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  action: PropTypes.node,
};

export default Navbar;