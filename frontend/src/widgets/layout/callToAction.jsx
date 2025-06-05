// src/views/CallToAction.js
import React, { useState } from "react";
import {
  Card,
  CardBody,
  Typography,
  Input,
  Button,
} from "@material-tailwind/react";

export function CallToAction() {
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    if (!email) return;
    // tu lahko kličeš API za prijavo ali shraniš v localStorage
    alert(`Hvala za prijavo! Poslali vam bomo novice na ${email}`);
    setEmail("");
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
        <Card className="mx-auto max-w-lg">
          <CardBody className="flex flex-col md:flex-row items-center gap-4 p-6">
            <Input
              type="email"
              variant="outlined"
              size="md"
              fullWidth={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vnesi svoj email..."
              className="flex-1"
            />
            <Button
              variant="gradient"
              size="md"
              onClick={handleSubscribe}
              className="whitespace-nowrap"
            >
              Preizkusi zdaj
            </Button>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

export default CallToAction;