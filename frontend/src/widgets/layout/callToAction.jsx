import React, { useState } from "react";
import {
  Card,
  CardBody,
  Typography,
  Input,
  Button,
  Checkbox,
} from "@material-tailwind/react";
import toast from "react-hot-toast";

export function CallToAction() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email) {
      toast.error("Prosimo, vnesite svoj email.");
      return;
    }
    if (!agreed) {
      toast.error("Prosimo, potrdite, da se strinjate s politiko zasebnosti.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://bestpriceprojekt-production.up.railway.app/api/subscribe-newsletter", { //https://bestpriceprojekt-production.up.railway.app/api/subscribe-newsletter
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Prišlo je do napake pri prijavi.");
      } else {
        toast.success(data.message || `Hvala za prijavo! Poslali vam bomo novice na ${email}`);
        setEmail("");
        setAgreed(false);
      }
    } catch (error) {
      toast.error("Napaka pri povezavi s strežnikom. Poskusi znova.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-blue-gray-50">
      <div className="container mx-auto px-4 text-center">
        <Typography variant="h4" className="mb-4 font-semibold">
          Prijavi se na obvestila o najboljših akcijah!
        </Typography>
        <Typography className="mb-8 text-gray-700">
          Preizkusi našo aplikacijo brez kakršnih koli obveznosti.  
          Prijavi se in prejmi obvestila o najboljših akcijah neposredno v svoj e-poštni predal.
        </Typography>
      <Card className="mx-auto w-full max-w-2xl shadow-lg rounded-xl">
        <CardBody className="flex flex-col sm:flex-row items-stretch gap-4 p-6">
            <div className="w-full sm:w-[450px]">
            <Input
              type="email"
              variant="outlined"
              size="sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vnesi svoj email..."
              disabled={loading}
            />
          </div>

          <Button
            variant="gradient"
            size="sm"
            onClick={handleSubscribe}
            disabled={loading}
            className="whitespace-nowrap min-w-[130px]"
          >
            {loading ? "Počakajte..." : "Preizkusi zdaj"}
          </Button>
        </CardBody>

        <div className="flex items-center mt-2 px-6 pb-4">
          <Checkbox
            id="privacyPolicy"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={loading}
          />
          <label htmlFor="privacyPolicy" className="ml-2 text-sm text-gray-600 cursor-pointer select-none">
            Strinjam se s{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              politiko zasebnosti
            </a>.
          </label>
        </div>
      </Card>
      </div>
    </section>
  );
}

export default CallToAction;
