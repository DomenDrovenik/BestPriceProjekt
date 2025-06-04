import React from "react";
import {
  Typography,
  Card,
  CardBody,
} from "@material-tailwind/react";
import { Footer } from "@/widgets/layout";

export function PrivacyPolicy() {
  return (
    <>
      <div className="relative flex h-[40vh] content-center items-center justify-center pt-16 pb-16">
        <div className="absolute top-0 h-full w-full bg-[url('/img/privacy.png')] bg-no-repeat bg-center bg-contain bg-fixed" />

        <div className="absolute top-0 h-full w-full bg-black/70 bg-cover bg-center" />
        <div className="container relative mx-auto px-4 text-center">
          <Typography variant="h2" color="white" className="font-bold">
            Pravilnik o zasebnosti
          </Typography>
          <Typography variant="lead" color="white" className="mt-4 opacity-80">
            Vaša zasebnost je za nas pomembna. Tukaj pojasnjujemo, kako ravnamo z vašimi podatki.
          </Typography>
        </div>
      </div>

      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-5xl">
          <Card shadow={false}>
            <CardBody>
              <Typography variant="h5" className="mb-6 font-bold">
                1. Zbiranje podatkov
              </Typography>
              <Typography className="mb-4">
                Aplikacija BestPrice zbira naslednje podatke: imena, priimke, e-poštne naslove uporabnikov, nastavitve obvestil, ter podatke o izbranih izdelkih in nakupovalnih seznamih. Ti podatki se zbirajo izključno za potrebe delovanja aplikacije.
              </Typography>

              <Typography variant="h5" className="mt-8 mb-6 font-bold">
                2. Uporaba podatkov
              </Typography>
              <Typography className="mb-4">
                Vaše podatke uporabljamo za pošiljanje obvestil o spremembah cen, shranjevanje vaših seznamov in prilagajanje vsebine aplikacije. Vaših podatkov ne delimo s tretjimi osebami.
              </Typography>

              <Typography variant="h5" className="mt-8 mb-6 font-bold">
                3. Pravna podlaga
              </Typography>
              <Typography className="mb-4">
                Podatke obdelujemo v skladu z zakonodajo (GDPR) in jih hranimo le, dokler je to nujno potrebno za delovanje aplikacije.
              </Typography>

              <Typography variant="h5" className="mt-8 mb-6 font-bold">
                4. Shranjevanje podatkov
              </Typography>
              <Typography className="mb-4">
                Podatki se hranijo v varni bazi MongoDB v oblaku. Vzpostavljeni so redni varnostni backupi in zaščitni mehanizmi za preprečevanje nepooblaščenega dostopa.
              </Typography>
              <Typography variant="h5" className="mt-8 mb-6 font-bold">
                5. Vaše pravice
              </Typography>
              <Typography className="mb-4">
                Uporabniki imate pravico do vpogleda, popravka in izbrisa svojih osebnih podatkov. Vse zahteve lahko pošljete na: <a href="mailto:bestpricesi25@gmail.com" className="text-blue-600 underline">bestpricesi25@gmail.com</a>.
              </Typography>

              <Typography variant="h5" className="mt-8 mb-6 font-bold">
                6. Spremembe pravilnika
              </Typography>
              <Typography className="mb-4">
                Pravilnik se lahko občasno spremeni. Vse spremembe bodo pravočasno objavljene na tej strani.
              </Typography>
            </CardBody>
          </Card>
        </div>
      </section>

      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}

export default PrivacyPolicy;