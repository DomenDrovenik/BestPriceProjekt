// src/pages/sign-in.jsx
import { useState, useEffect } from "react";
import {
  Input,
  Checkbox,
  Button,
  Typography,
} from "@material-tailwind/react";
import { Link, useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  TwitterAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase.js";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already signed in, kick to home immediately
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/", { replace: true });
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // redirect happens in onAuthStateChanged
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // redirect in onAuthStateChanged
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleTwitterSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <section className="m-8 flex gap-4">
      <div className="w-full lg:w-3/5 mt-24">
        <div className="text-center">
         <Typography variant="h2" className="font-bold mb-4">
          Prijava
        </Typography>
        <Typography
          variant="paragraph"
          color="blue-gray"
          className="text-lg font-normal"
        >
          Vnesi svoj e-poštni naslov in geslo za prijavo.
        </Typography>
        </div>

        <form
          onSubmit={handleEmailSignIn}
          className="mt-8 mb-2 mx-auto w-80 max-w-screen-lg lg:w-1/2"
        >
          {error && (
            <Typography color="red" className="mb-4 text-center">
              {error}
            </Typography>
          )}
          <div className="mb-1 flex flex-col gap-6">
            <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
              E-poštni naslov
            </Typography>
            <Input
              size="lg"
              type="email"
              placeholder="name@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />
            <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
              Geslo
            </Typography>
            <Input
              type="password"
              size="lg"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-4">
            <Checkbox
              checked={subscribe}
              onChange={(e) => setSubscribe(e.target.checked)}
              label={
                <Typography
                variant="small"
                color="gray"
                className="flex items-center justify-start font-medium"
              >
                Naroči me na e-novice
              </Typography>

              }
              containerProps={{ className: "-ml-2.5" }}
            />
            <Typography variant="small" className="font-medium text-gray-900">
              <a href="#">Pozabljeno geslo?</a>
            </Typography>

          </div>

         <Button type="submit" className="mt-6" fullWidth disabled={loading}>
          {loading ? "Prijavljam..." : "Prijava"}
        </Button>

          <div className="space-y-4 mt-8">
            <Button
              size="lg"
              color="white"
              className="flex items-center gap-2 justify-center shadow-md"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {/* Google SVG here */}
              <span>Prijava  z Googlom</span>
            </Button>
            <Button
              size="lg"
              color="white"
              className="flex items-center gap-2 justify-center shadow-md"
              fullWidth
              onClick={handleTwitterSignIn}
              disabled={loading}
            >
              <img
                src="/img/twitter-logo.svg"
                height={24}
                width={24}
                alt="Twitter logo"
              />
              <span>Prijava s Twitterjem</span>
            </Button>
          </div>

          <Typography
              variant="paragraph"
              className="text-center text-blue-gray-500 font-medium mt-4"
            >
              Nimaš računa?
              <Link to="/sign-up" className="text-gray-900 ml-1">
                Ustvari račun
              </Link>
            </Typography>

        </form>
      </div>

      <div className="w-2/5 h-full hidden lg:block">
        <img
          src="/img/pattern.png"
          alt="pattern"
          className="h-full w-full object-cover rounded-3xl"
        />
      </div>
    </section>
  );
}

export default SignIn;