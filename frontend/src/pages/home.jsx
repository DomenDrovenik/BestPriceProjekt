import React from "react";
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
import {  Footer, HowItWorks, TopDeals, CallToAction } from "@/widgets/layout";
import { FeatureCard,  Categories } from "@/widgets/cards";
import { featuresData } from "@/data";

export function Home() {
  return (
    <>
      <div className="relative flex h-[70vh] content-center items-center justify-center pt-16 pb-16">
         <div className="absolute top-0 h-full w-full bg-[url('/img/background.jpg')] bg-cover bg-center " />  {/*bg-fixed */}
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
      <section className="-mt-32 bg-white px-4 pb-20 pt-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuresData.map(({ color, title, icon, description }) => (
              <FeatureCard
                key={title}
                color={color}
                title={title}
                icon={React.createElement(icon, {
                  className: "w-5 h-5 text-white",
                })}
                description={description}
              />
            ))}
          </div>
          <Categories />
          <TopDeals />
          <HowItWorks />
          <br />
          <CallToAction />
        </div>
      </section>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}

export default Home;
