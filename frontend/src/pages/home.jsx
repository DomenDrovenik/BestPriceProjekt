import React from "react";
import { Helmet } from "react-helmet"; // Uvozimo react-helmet
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Input,
  Textarea,
  Checkbox,
} from "@material-tailwind/react";
import { Footer, HowItWorks, TopDeals, CallToAction } from "@/widgets/layout";
import { FeatureCard, Categories } from "@/widgets/cards";
import { featuresData } from "@/data";

export function Home() {
  // Prilagodi URL in opise glede na svojo domeno
  const siteUrl = "https://bestprice-4c8cd.firebaseapp.com";
  const pageTitle = "Najboljša primerjava cen živil v Sloveniji";
  const pageDescription =
    "Prihranite čas in denar z našim enostavnim iskalnikom najugodnejših cen živil v Sloveniji.";
  const canonicalUrl = `${siteUrl}/`;

  // JSON-LD strukturirani podatki za glavno spletno mesto
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": siteUrl,
    "name": pageTitle,
    "description": pageDescription,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/search?query={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      {/* === SEO BLOK Z REACT-HELMET === */}
      <Helmet>
        {/* Osnovne SEO oznake */}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="primerjava cen, živila, supermarketi, Slovenija, varčevanje"
        />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph (Facebook, LinkedIn itd.) */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        {/* Poskrbi, da obstaja slika dimenzij najmanj 1200×630 px */}
        <meta property="og:image" content={`${siteUrl}/img/og-image.jpg`} />
        <meta
          property="og:image:alt"
          content="Primerjava cen živil v Sloveniji – logotip"
        />

        {/* JSON-LD strukturirani podatki */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      {/* === HERO SEKCIJA === */}
      <div className="relative flex h-[70vh] content-center items-center justify-center pt-16 pb-16">
        {/* Ozadje z visoko ločljivostjo (vsaj 1200×630 za OG) */}
        <div
          className="absolute top-0 h-full w-full bg-[url('/img/background.jpg')] bg-cover bg-center"
          role="img"
          aria-label="Ozadje z nakupovalno košaro in živili"
        />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
          <div className="flex flex-wrap items-center">
            <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
              <Typography
                variant="h1"
                color="white"
                className="mb-6 font-black"
              >
                Najboljša primerjava cen živil v Sloveniji
              </Typography>
              <Typography variant="lead" color="white" className="opacity-80">
                Prihranite čas in denar z našim enostavnim iskalnikom najugodnejših cen
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* === GLAVNA VSEBINA === */}
      <section className="-mt-32 bg-white px-4 pb-20 pt-4">
        <div className="container mx-auto">
          {/* Prednosti / feature kartice */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuresData.map(({ color, title, icon, description }) => (
              <FeatureCard
                key={title}
                color={color}
                title={title}
                icon={React.createElement(icon, {
                  className: "w-5 h-5 text-white",
                  "aria-hidden": "true",
                })}
                description={description}
              />
            ))}
          </div>

          {/* Kategorije */}
          <Categories />

          {/* Najboljše ponudbe */}
          <TopDeals />

          {/* Kako deluje */}
          <HowItWorks />

          <br />
          {/* Klic k akciji */}
          <CallToAction />
        </div>
      </section>

      {/* === FOOTER === */}
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}

export default Home;