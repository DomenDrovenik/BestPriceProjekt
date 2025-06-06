// src/frontend/SignUp.jsx
import { useState, useEffect } from "react";
import {
  Input,
  Checkbox,
  Button,
  Typography,
} from "@material-tailwind/react";
import { Link, useNavigate } from "react-router-dom";

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, firestore } from "../firebase.js";
import toast from "react-hot-toast"; // <-- uvozimo toast

export function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [agreeTC, setAgreeTC] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Če je uporabnik že prijavljen, ga preusmerimo domov
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/", { replace: true });
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreeTC) {
      setError("Morate se strinjati s Pogoji in določili.");
      return;
    }
    if (!name.trim() || !surname.trim()) {
      setError("Prosimo vnesite ime in priimek.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // zapišemo celoten profil (vključno z imenom in priimkom) v Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        email: user.email,
        name: name.trim(),
        surname: surname.trim(),
        createdAt: new Date(),
      });

      // Uspešno registriran → prikažemo toast in preusmerimo domov
      toast.success("Registracija uspešna! Prijavljeni ste.");
      navigate("/", { replace: true });
    } catch (e) {
      console.error("Napaka pri registraciji:", e);
      // Prikažemo kratko obvestilo o napaki
      toast.error("Napaka pri registraciji: " + e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);

      // za social sign-in včasih dobimo le displayName (polno ime)
      const [first = "", ...rest] = (user.displayName || "").split(" ");
      const last = rest.join(" ");

      await setDoc(
        doc(firestore, "users", user.uid),
        {
          email: user.email,
          name: first,
          surname: last,
          photoURL: user.photoURL || "",
          createdAt: new Date(),
        },
        { merge: true }
      );

      toast.success("Prijava z Googlom uspešna!");
      navigate("/", { replace: true });
    } catch (e) {
      console.error("Google prijava napaka:", e);
      toast.error("Napaka pri prijavi z Googlom: " + e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="m-8 flex">
      <div className="w-2/5 h-full hidden lg:block">
        <img
          src="/img/pattern.png"
          alt="pattern"
          className="h-full w-full object-cover rounded-3xl"
        />
      </div>
      <div className="w-full lg:w-3/5 flex flex-col items-center justify-center">
        <div className="text-center">
          <Typography variant="h2" className="font-bold mb-4">
            Registracija
          </Typography>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 mb-2 mx-auto w-80 max-w-screen-lg lg:w-1/2"
        >
          {error && (
            <Typography color="red" className="mb-4 text-center">
              {error}
            </Typography>
          )}

          <div className="mb-1 flex flex-col gap-6">
            <Typography
              variant="small"
              color="blue-gray"
              className="-mb-3 font-medium"
            >
              Email račun
            </Typography>
            <Input
              size="lg"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@mail.com"
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />

            <Typography
              variant="small"
              color="blue-gray"
              className="-mb-3 font-medium"
            >
              Geslo
            </Typography>
            <Input
              type="password"
              size="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />

            <Typography
              variant="small"
              color="blue-gray"
              className="-mb-3 font-medium"
            >
              Ime
            </Typography>
            <Input
              size="lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ime"
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />

            <Typography
              variant="small"
              color="blue-gray"
              className="-mb-3 font-medium"
            >
              Priimek
            </Typography>
            <Input
              size="lg"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="Priimek"
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            />
          </div>

          <Checkbox
            checked={agreeTC}
            onChange={(e) => setAgreeTC(e.target.checked)}
            label={
              <Typography
                variant="small"
                color="gray"
                className="flex items-center justify-start font-medium"
              >
                Strinjam se z&nbsp;
                <a
                  href="#"
                  className="font-normal text-black transition-colors hover:text-gray-900 underline"
                >
                  Pogoji in določila
                </a>
              </Typography>
            }
            containerProps={{ className: "-ml-2.5" }}
          />

          <Button
            type="submit"
            className="mt-6"
            fullWidth
            disabled={loading}
          >
            {loading ? "Registracija..." : "Registracija"}
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
              {/* Google SVG */}
              <span>Registracija z Google</span>
            </Button>
          </div>

          <Typography
            variant="paragraph"
            className="text-center text-blue-gray-500 font-medium mt-4"
          >
            Že imaš račun?
            <Link to="/sign-in" className="text-gray-900 ml-1">
              Prijava
            </Link>
          </Typography>
        </form>
      </div>
    </section>
  );
}

export default SignUp;