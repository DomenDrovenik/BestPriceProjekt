import React, { useState } from "react";
import {
  Card,
  CardBody,
  Typography,
  IconButton,
} from "@material-tailwind/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { categories_data } from "@/data/categories-data";
import { Link as RouterLink } from "react-router-dom";

export function Categories() {
    const [start, setStart] = useState(0);
    const pageSize = 4;
    const end = Math.min(start + pageSize, categories_data.length);
  
    const prev = () => setStart((s) => Math.max(0, s - pageSize));
    const next = () =>
      setStart((s) => Math.min(categories_data.length - pageSize, s + pageSize));
  
    return (
      <section className="relative py-12 bg-white">
        <div className="container mx-auto px-4">
          <Typography
            variant="h3"
            className="mb-6 font-semibold text-center"
          >
            Prebrskaj po kategorijah
          </Typography>
  
          {/* Arrows */}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 z-10">
            <IconButton
              variant="text"
              color="blue-gray"
              onClick={prev}
              disabled={start === 0}
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </IconButton>
          </div>
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10">
            <IconButton
              variant="text"
              color="blue-gray"
              onClick={next}
              disabled={end === categories_data.length}
            >
              <ChevronRightIcon className="h-6 w-6" />
            </IconButton>
          </div>
  
          {/* Cards row */}
          <div className="flex overflow-hidden">
            {categories_data.slice(start, end).map(({ name, img }) => (
              <Card
                key={name}
                className="min-w-1/4 flex-1 mx-2 overflow-hidden hover:shadow-lg transition-shadow"
                as={RouterLink}
                to={`/products?category=${encodeURIComponent(name)}`}
              >
                <img
                  src={img}
                  alt={name}
                  className="h-40 w-full object-cover"
                />
                <CardBody className="py-4 text-center">
                  <Typography variant="h6">{name}</Typography>
                  <Typography variant="small" className="text-gray-500">
                    Klikni za ogled izdelkov
                  </Typography>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

export default Categories;