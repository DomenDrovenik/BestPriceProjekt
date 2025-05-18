import React, { useState, useEffect } from "react";
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
import { Link as RouterLink } from "react-router-dom";
import { categories } from "@/data/categories";

export function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/all-products");
        const data = await res.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error("Napaka pri pridobivanju podatkov:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCats, priceRange]);

  const normalizeCategory = (category, subcategory) => {
    const cat = (category || "").toLowerCase();
    const sub = (subcategory || "").toLowerCase();

    if (cat.includes("sadje") || cat.includes("zelenjava") || sub.includes("sadje") || sub.includes("zelenjava")) return "Sadje in zelenjava";
    if (cat.includes("mleko") || cat.includes("mlečni") || sub.includes("mleko") || sub.includes("smetane") || sub.includes("masla") || sub.includes("sir")) return "Mlečni izdelki";
    if (cat.includes("jajca") || sub.includes("jajca")) return "Mlečni izdelki";
    if (cat.includes("meso") || cat.includes("ribe") || sub.includes("mesni") || sub.includes("sveže meso") || sub.includes("zamrznjeno meso")) return "Meso in ribe";
    if (cat.includes("kruh") || cat.includes("pecivo") || sub.includes("toast") || sub.includes("prepečenci") || sub.includes("kruh") || sub.includes("pecivo")) return "Pekovski izdelki";
    if (cat.includes("zamrznjena") || cat.includes("zamrzjena") || sub.includes("sladoled") || sub.includes("zamrznjena zelenjava") || sub.includes("zamrznjene jedi") || sub.includes("zamrznjene ribe")) return "Zamrznjena hrana";
    if (cat.includes("konzervirana") || sub.includes("konzerve") || sub.includes("vložen") || sub.includes("kompoti")) return "Konzervirana živila";
    if (cat.includes("olje") || cat.includes("mast") || sub.includes("olje") || sub.includes("mast") || sub.includes("kis") || sub.includes("sol")) return "Olja in maščobe";
    if (cat.includes("testenine") || cat.includes("juhe") || cat.includes("riž") || cat.includes("začimbe") || sub.includes("testenine") || sub.includes("juhe") || sub.includes("riž") || sub.includes("omake") || sub.includes("začimbe")) return "Testenine, žita, juhe";
    if (cat.includes("sladki") || cat.includes("čokolada") || cat.includes("prigrizki") || sub.includes("sladki") || sub.includes("čokolada") || sub.includes("namazi") || sub.includes("sladkor") || sub.includes("aperitivi")) return "Sladkor, sladkarije in prigrizki";
    if (cat.includes("pijače") || cat.includes("alkoholne") || cat.includes("brezalkoholne") || sub.includes("pijače") || sub.includes("sokovi") || sub.includes("vode") || sub.includes("gazirane") || sub.includes("piva") || sub.includes("napitki") || sub.includes("sirupi") || sub.includes("čaji") || sub.includes("kave") || sub.includes("vinska")) return "Pijače";
    if (cat.includes("bio") || sub.includes("zdrava") || sub.includes("dietetična")) return "Bio izdelki";
    if (cat.includes("delikatesni") || cat.includes("pripravljene") || sub.includes("pripravljene") || sub.includes("delikatesni")) return "Pripravljene jedi";
   
    return "Drugo";
  };

  const categorize = (product) => normalizeCategory(product.category, product.subcategory);

  const filtered = products
    .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => {
      const cat = categorize(p);
      return selectedCats.length === 0 || selectedCats.includes(cat);
    })
    .filter((p) => {
      const cena = parseFloat(p.price?.toString().replace(",", "."));
      return cena >= priceRange[0] && cena <= priceRange[1];
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginated = filtered.slice(startIdx, endIdx);

  const toggleCat = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-1 mt-10 flex-wrap">
        <button
          onClick={() => setCurrentPage((prev) => prev - 1)}
          disabled={currentPage === 1}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === 1 ? "opacity-30" : "hover:bg-gray-100"}`}
        >
          &#8249;
        </button>

        {pages.map((p, idx) => (
          <button
            key={idx}
            disabled={p === "..."}
            onClick={() => typeof p === "number" && setCurrentPage(p)}
            className={`w-9 h-9 rounded-full border ${
              currentPage === p
                ? "border-red-500 text-red-500 font-bold"
                : "text-gray-700 hover:bg-gray-100"
            } ${p === "..." ? "cursor-default text-gray-400 border-none" : ""}`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={currentPage === totalPages}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === totalPages ? "opacity-30" : "hover:bg-gray-100"}`}
        >
          &#8250;
        </button>
      </div>
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
              <Typography variant="h1" color="white" className="mb-6 font-black">
                Raziskuj cene v trgovinah
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <PageTitle heading="Seznam izdelkov" />
      <br />

      <div className="container mx-auto flex flex-col-reverse gap-6 px-4 md:flex-row">
        <aside className="w-full shrink-0 md:w-1/4">
          <Card className="mb-6">
            <CardHeader className="bg-blue-gray-50 rounded-t-lg">
              <Typography variant="h5" color="blue-gray" className="font-semibold">
                Filtri
              </Typography>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <Typography variant="small" className="block mb-2 font-medium">
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

              <div>
                <Typography variant="small" className="block mb-2 font-medium">
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

              <div>
                <Typography variant="small" className="block mb-2 font-medium">
                  Razpon cen (€)
                </Typography>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                  />
                  <span>–</span>
                  <Input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                  />
                </div>
              </div>

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

        <section className="flex-1">
          {loading ? (
            <Typography className="text-center text-gray-500">
              Nalagam izdelke...
            </Typography>
          ) : paginated.length === 0 ? (
            <Typography className="text-center text-gray-500">
              Ni najdenih izdelkov.
            </Typography>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((p, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader floated={false} className="h-36 flex items-center justify-center bg-white">
                      {p.image && p.image.startsWith("http") ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-28 w-auto object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/img/no-image.png";
                          }}
                        />
                      ) : (
                        <img
                          src="/img/no-image.png"
                          alt="no image"
                          className="max-h-28 w-auto object-contain"
                        />
                      )}
                    </CardHeader>
                    <CardBody className="pb-4">
                      <Typography variant="h5" className="mb-2 font-bold">
                        {p.name}
                      </Typography>
                      <Typography variant="paragraph" className="mb-4 text-blue-gray-600">
                        {categorize(p)}
                      </Typography>
                      <Typography variant="h6" className="mb-4 font-semibold">
                        {(parseFloat(p.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                      </Typography>
                      <Button
                        component={RouterLink}
                        to={`/products/${p._id}`}
                        size="sm"
                      >
                        Več
                      </Button>
                      <br />
                      <br />
                      <Typography variant="paragraph" className="mb-4 text-blue-gray-600">
                        Posodobljeno:{' '}
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleDateString('sl-SI', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                        : 'ni podatka'}
                      </Typography>
                    </CardBody>
                  </Card>
                ))}
              </div>
              {renderPagination()}
              <div className="h-20" />
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default Products;
