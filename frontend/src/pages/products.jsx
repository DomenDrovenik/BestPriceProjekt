// src/views/Products.js
import React, { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  Input,
  Checkbox,
} from "@material-tailwind/react";
import { PageTitle } from "@/widgets/layout";
import { productsData, categories } from "@/data"; // svoje podatke importiraj od tukaj
import { Link as RouterLink } from "react-router-dom";

export function Products() {
  // stanja za filtre
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100]);

  // filtriranje izdelkov
  const filtered = productsData
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((p) =>
      selectedCats.length === 0 || selectedCats.includes(p.category)
    )
    .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

  // helper za toggle kategorije
  const toggleCat = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat]
    );
  };

  return (
    <>
     <div className="relative flex h-[50vh] content-center items-center justify-center pt-16 pb-16">
        <div className="absolute top-0 h-full w-full bg-[url('/img/hrana.jpg')] bg-cover bg-center" />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
          <div className="flex flex-wrap items-center">
            <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
              <Typography
                variant="h1"
                color="white"
                className="mb-6 font-black"
              >
                Your story starts with us.
              </Typography>
              <Typography variant="lead" color="white" className="opacity-80">
                This is a simple example of a Landing Page you can build using
                Material Tailwind. It features multiple components based on the
                Tailwind CSS and Material Design by Google.
              </Typography>
            </div>
          </div>
        </div>
      </div>
      <PageTitle section="Products" heading="Our Catalog" />

      <div className="container mx-auto flex flex-col-reverse gap-6 px-4 md:flex-row">
        {/* levi filter pane */}
        <aside className="w-full shrink-0 md:w-1/4">
          <Card className="mb-6">
          <CardHeader
              className="bg-blue-gray-50 rounded-t-lg"
            >
              <Typography variant="h5" color="blue-gray" className="font-semibold">
                Filtri
              </Typography>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* iskalnik */}
              <div>
                <Typography
                  variant="small"
                  className="block mb-2 font-medium"
                >
                  Išči izdelek
                </Typography>
                <Input
                  variant="outlined"
                  size="md"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Vnesi ime..."
                />
              </div>

              {/* kategorije */}
              <div>
                <Typography
                  variant="small"
                  className="block mb-2 font-medium"
                >
                  Kategorije
                </Typography>
                <div className="flex flex-col gap-1.5">
                  {categories.map((cat) => (
                    <Checkbox
                      key={cat}
                      label={cat}
                      checked={selectedCats.includes(cat)}
                      onChange={() => toggleCat(cat)}
                    />
                  ))}
                </div>
              </div>

              {/* cenovni razpon */}
              <div>
                <Typography
                  variant="small"
                  className="block mb-2 font-medium"
                >
                  Razpon cen (€)
                </Typography>
                <div className="flex items-center gap-2">
                    <div>
                <div className="w-1/4">
                  <Input
                    type="number"
                    variant="outlined"
                    size="md"
                    fullWidth={false}
                    inputProps={{ className: "h-9" }}
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                  />
                  </div>
                  <span>–</span>
                  <div className="w-1/4">
                  <Input
                    type="number"
                    variant="outlined"
                    size="md"
                    fullWidth={false}
                    inputProps={{ className: "h-9" }}
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                  />
                  </div>
                  </div>
                </div>
              </div>

              {/* ponastavi filtriranje */}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setSearch("");
                  setSelectedCats([]);
                  setPriceRange([0, 100]);
                }}
              >
                Počisti filtre
              </Button>
            </CardBody>
          </Card>
        </aside>

        {/* desni produktni grid */}
        <section className="flex-1">
          {filtered.length === 0 ? (
            <Typography className="text-center text-gray-500">
              Ni najdenih izdelkov.
            </Typography>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader floated={false} className="h-48">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </CardHeader>
                  <CardBody className="pb-4">
                    <Typography
                      variant="h5"
                      className="mb-2 font-bold"
                    >
                      {p.name}
                    </Typography>
                    <Typography
                      variant="paragraph"
                      className="mb-4 text-blue-gray-600"
                    >
                      {p.category}
                    </Typography>
                    <Typography
                      variant="h6"
                      className="mb-4 font-semibold"
                    >
                      {p.price.toFixed(2)} €
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={`/products/${p.id}`}
                      size="sm"
                    >
                      Več
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default Products;