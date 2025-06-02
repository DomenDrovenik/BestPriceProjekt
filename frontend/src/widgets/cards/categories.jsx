// src/widgets/layout/Categories.jsx
import React, { useState,useEffect } from "react";
import {
  Card,
  CardBody,
  Typography,
  IconButton,
} from "@material-tailwind/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { Link as RouterLink } from "react-router-dom";
import categories from "@/data/categories";

export function Categories() {
  const [start, setStart] = useState(0);
  const [pageSize, setPageSize] = useState(4);
  // const pageSize = 4;
  const end = Math.min(start + pageSize, categories.length);

  const prev = () => setStart((s) => Math.max(0, s - pageSize));
  const next = () =>
    setStart((s) => Math.min(categories.length - pageSize, s + pageSize));

  useEffect(() => {
  const updatePageSize = () => {
    if (window.innerWidth < 768) {
      setPageSize(2); 
    } else {
      setPageSize(4); 
    }
  };

  updatePageSize(); 
  window.addEventListener("resize", updatePageSize); 

  return () => window.removeEventListener("resize", updatePageSize);
}, []);

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
            disabled={end === categories.length}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </IconButton>
        </div>

        {/* Cards row */}
        <div className="flex overflow-hidden flex-wrap justify-center gap-4">
  {categories.slice(start, end).map(({ name, img }) => (
    <RouterLink
      key={name}
      to={`/products?category=${encodeURIComponent(name)}`}
      className="w-[calc(50%-1rem)] md:w-[calc(25%-1rem)]"
    >
      <Card className="hover:shadow-lg transition-shadow">
        <img src={img} alt={name} className="h-40 w-full object-cover" />
        <CardBody className="py-4 text-center">
          <Typography variant="h6">{name}</Typography>
          <Typography variant="small" className="text-gray-500">
            Klikni za ogled izdelkov
          </Typography>
        </CardBody>
      </Card>
    </RouterLink>
  ))}
</div>
      </div>
    </section>
  );
}

export default Categories;