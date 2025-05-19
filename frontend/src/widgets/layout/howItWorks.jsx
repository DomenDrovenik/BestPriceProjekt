// src/views/HowItWorks.js
import React from "react";
import {
  Card,
  CardBody,
  Typography,
  IconButton,
} from "@material-tailwind/react";
import {
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  BellAlertIcon,
} from "@heroicons/react/24/solid";

export function HowItWorks() {
  const steps = [
    {
      title: "Išči izdelek",
      description: "Vnesi ime ali izberite kategorijo, da poiščeš želeni izdelek.",
      icon: MagnifyingGlassIcon,
      animation: "animate-pulse",
    },
    {
      title: "Primerjaj cene",
      description:
        "Primerjaj cene istega izdelka med različnimi trgovinami z enim klikom.",
      icon: ArrowsRightLeftIcon,
    },
    {
      title: "Prihrani",
      description:
        "Prihrani pri nakupu ali prejmi obvestilo, ko cena pade pod nastavljeno mejo.",
      icon: BellAlertIcon,
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 text-center">
        <Typography variant="h4" className="mb-8 font-semibold">
          Kako deluje
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ title, description, icon: Icon, animation }, idx) => (
            <Card key={title} className="shadow-none">
              <CardBody className="flex flex-col items-center px-6">
                <div
                  className={`p-4 rounded-full bg-blue-gray-100 mb-4 ${animation}`}
                >
                  <Icon className="h-8 w-8 text-blue-gray-700" />
                </div>
                <Typography variant="h6" className="mb-2 font-medium">
                  {`${idx + 1}. ${title}`}
                </Typography>
                <Typography className="text-gray-600">
                  {description}
                </Typography>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;