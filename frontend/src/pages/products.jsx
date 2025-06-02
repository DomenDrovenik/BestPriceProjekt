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
import { UpdatedBadge } from "@/widgets/cards";
import { Link as RouterLink } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { categories } from "@/data/categories";
import { auth, firestore } from "../firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Dialog, DialogHeader, DialogBody, DialogFooter, Select, Option } from "@material-tailwind/react";
import toast from "react-hot-toast";
import {
  StarIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon
} from "@heroicons/react/24/solid";
import useSWR from 'swr';
const fetcher = (url) => fetch(url).then((res) => res.json());

export function Products() {
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStores, setSelectedStores] = useState([]);
  const itemsPerPage = 24;
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortByDiscount, setSortByDiscount] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false); 
  const [searchParams] = useSearchParams();

  const { data: productsData, error } = useSWR(
    'https://bestpriceprojekt-production.up.railway.app/api/all-products',
    fetcher
  );

  if (error) {
    return <Typography color="red" className="text-center py-4">
      Napaka pri nalaganju izdelkov.
    </Typography>;
  }
  if (!productsData) {
    return <Typography className="text-center py-4">
      Nalagam izdelke…
    </Typography>;
  }

  const products = React.useMemo(
    () => productsData.map((p) => {
      const avgRating = p.comments?.length
        ? Number(
            (p.comments.reduce((sum, c) => sum + (c.rating || 0), 0) / p.comments.length)
            .toFixed(1)
          )
        : 0;
      return { ...p, avgRating };
    }),
    [productsData]
  );

  useEffect(() => {
    const initialCat = searchParams.get("category");
    if (initialCat) {
      setSelectedCats([decodeURIComponent(initialCat)]);
    }

    const initialDiscount = searchParams.get("onlyDiscounted");
    if (initialDiscount === "true") {
      setOnlyDiscounted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCats, priceRange, minRating, sortBy]);

  const toggleStore = (store) => {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  };

  const toggleCat = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const normalizeCategory = (category, subcategory) => {
    const cat = (category || "").toLowerCase();
    const sub = (subcategory || "").toLowerCase();
    if (cat.includes("sadje") || sub.includes("zelenjava")) return "Sadje in zelenjava";
    if (cat.includes("mleko") || cat.includes("mlečni izdelki") || sub.includes("sir")) return "Mlečni izdelki";
    if (cat.includes("meso") || sub.includes("ribe")) return "Meso in ribe";
    if (cat.includes("kruh") || sub.includes("toast")) return "Pekovski izdelki";
    if (cat.includes("zamrznjena") || sub.includes("sladoled")) return "Zamrznjena hrana";
    if (cat.includes("konzervirana") || cat.includes("konzervire") || sub.includes("konzerve")) return "Konzervirana živila";
    if (cat.includes("olje") || sub.includes("sol")) return "Olja in maščobe";
    if (cat.includes("testenine") || sub.includes("juhe")) return "Testenine, žita, juhe";
    if (cat.includes("sladki") || cat.includes("sladkarije") || cat.includes("sladkor")  || sub.includes("čokolada") ) return "Sladkor, sladkarije in prigrizki";
    if (cat.includes("pijače") || sub.includes("sokovi")) return "Pijače";
    if (cat.includes("bio") || sub.includes("zdrava")) return "Bio izdelki";
    if (cat.includes("delikatesni") || cat.includes("gotove jedi") || cat.includes("delikatesa") || sub.includes("pripravljene")) return "Pripravljene jedi";
     if ( cat.includes("kava") || sub.includes("zajtrk") || sub.includes("kosmiči") || sub.includes("marmelada") ||
      sub.includes("namazi") || sub.includes("čaj") || sub.includes("kava") ||
      sub.includes("maslo") || sub.includes("med") || sub.includes("nutella") ||
      sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi") ||
      sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") ||
      sub.includes("sladki namazi")) return "Vse za zajtrk";
    if (sub.includes("vse za peko") || cat.includes("jajca"))  return "Vse za peko";
    if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";

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
    })
    .filter((p) => selectedStores.length === 0 || selectedStores.includes(p.store))
    .filter((p) => !onlyDiscounted || p.actionPrice != null)
    .filter((p) => p.avgRating >= minRating)
    .sort((a, b) => {
      if (sortBy === "rating-desc") return b.avgRating - a.avgRating;
      if (sortBy === "rating-asc") return a.avgRating - b.avgRating;
      if (sortByDiscount) {
        const discountA = a.actionPrice ? 
          Math.round(100 - (a.actionPrice / a.price) * 100) : 0;
        const discountB = b.actionPrice ? 
          Math.round(100 - (b.actionPrice / b.price) * 100) : 0;
        return discountB - discountA;
      }
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-1 mt-10 flex-wrap">
        <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === 1 ? "opacity-30" : "hover:bg-gray-100"}`}>
          &#8249;
        </button>
        {pages.map((p, idx) => (
          <button key={idx} disabled={p === "..."} onClick={() => typeof p === "number" && setCurrentPage(p)}
            className={`w-9 h-9 rounded-full border ${currentPage === p ? "border-red-500 text-red-500 font-bold" : "text-gray-700 hover:bg-gray-100"} ${p === "..." ? "cursor-default text-gray-400 border-none" : ""}`}>
            {p}
          </button>
        ))}
        <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === totalPages ? "opacity-30" : "hover:bg-gray-100"}`}>
          &#8250;
        </button>
      </div>
    );
  };

  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserLists = async (uid) => {
    const snapshot = await getDocs(collection(firestore, "users", uid, "lists"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const addItemToList = async (userId, listId, product) => {
    const ref = doc(firestore, "users", userId, "lists", listId);
    const listSnap = await getDocs(collection(firestore, "users", userId, "lists"));
    const targetList = listSnap.docs.find(doc => doc.id === listId);
    if (!targetList) return;

    const listData = targetList.data();
    const existingItems = listData.items || [];

    const itemExists = existingItems.some(item => item.name === product.name);
    if (itemExists) {
      toast.error("Ta izdelek je že na seznamu.");
      return;
    }

    const newItem = {
      id: Date.now(),
      name: product.name,
      amount: "",
      done: false,
      store: product.store || "",
      price: parseFloat((product.actionPrice || product.price || "0").toString().replace(",", ".")) || 0,
    };

    const updatedItems = [...existingItems, newItem];
    await updateDoc(ref, { items: updatedItems });
    toast.success("Izdelek je bil uspešno dodan!");
  };

  const [showDialog, setShowDialog] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const openDialog = async (product) => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Za uporabo te funkcije se moraš prijaviti.");
      return;
    }

    const lists = await fetchUserLists(user.uid);
    if (lists.length === 0) {
      toast("Nimaš še ustvarjenih seznamov.", { icon: "ℹ️" });
      return;
    }

    setUserLists(lists);
    setSelectedProduct(product);
    setSelectedListId(lists[0].id);
    setShowDialog(true);
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

      <div className="container mx-auto px-4">
        {/* Gumb za prikaz filtrov samo v mobilnem pogledu */}
        <div className="md:hidden mb-4">
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2"
          >
            <FunnelIcon className="h-5 w-5" />
            {showFilters ? 'Skrij filtre' : 'Prikaži filtre'}
            {showFilters ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filtri - prikazani vedno v desktop pogledu, v mobilnem pogledu samo če je showFilters true */}
          <aside className={`w-full md:w-1/4 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <Card className="mb-6">
              <CardHeader className="bg-blue-gray-50 rounded-t-lg mt-5">
                <Typography variant="h5" color="blue-gray" className="font-semibold">Filtri</Typography>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Išči izdelek</Typography>
                  <Input variant="outlined" size="md" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vnesi ime..." />
                </div>

                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Kategorije</Typography>
                  <div className="flex flex-col gap-1.5">
                    {categories.map(({ name }) => (
                      <Checkbox key={name} label={name} checked={selectedCats.includes(name)} onChange={() => toggleCat(name)} />
                    ))}
                  </div>
                </div>

                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Trgovci</Typography>
                  <div className="flex flex-col gap-1.5">
                    {["Mercator", "Tuš", "Jager", "Lidl", "Hofer"].map((store) => (
                      <Checkbox key={store} label={store} checked={selectedStores.includes(store)} onChange={() => toggleStore(store)} />
                    ))}
                  </div>
                </div>
                
                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Posebne ponudbe</Typography>
                  <Checkbox
                    label="Samo akcijski izdelki"
                    checked={onlyDiscounted}
                    onChange={() => setOnlyDiscounted(!onlyDiscounted)}
                  />
                  <Checkbox
                    label="Razvrsti po največjih popustih"
                    checked={sortByDiscount}
                    onChange={() => {
                      setSortByDiscount(!sortByDiscount);
                      setSortBy("");
                    }}
                  />
                </div>
                
                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Minimalna ocena</Typography>
                  <Select 
                    value={minRating.toString()} 
                    onChange={(val) => setMinRating(parseFloat(val))}
                    label="Izberi oceno"
                  >
                    <Option value="0">Vse ocene</Option>
                    <Option value="1">1+ zvezdica</Option>
                    <Option value="2">2+ zvezdici</Option>
                    <Option value="3">3+ zvezdice</Option>
                    <Option value="4">4+ zvezdice</Option>
                    <Option value="4.5">4.5+ zvezdic</Option>
                  </Select>
                </div>
                
                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Razvrsti po</Typography>
                  <Select 
                    value={sortBy} 
                    onChange={(val) => setSortBy(val)}
                    label="Razvrsti izdelke"
                  >
                    <Option value="">Privzeta razvrstitev</Option>
                    <Option value="rating-desc">Najvišja ocena</Option>
                    <Option value="rating-asc">Najnižja ocena</Option>
                  </Select>
                </div>

                <div>
                  <Typography variant="small" className="block mb-2 font-medium">Razpon cen (€)</Typography>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="number"
                      size="md"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
                      className="w-24"
                    />
                    <span className="text-sm">–</span>
                    <Input
                      type="number"
                      size="md"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
                      className="w-24"
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
                    setOnlyDiscounted(false);
                    setSelectedStores([]);
                    setMinRating(0);
                    setSortBy("");
                    setInitialLoadDone(false);
                    setSortByDiscount(false);
                  }}
                >
                  Počisti filtre
                </Button>
              </CardBody>
            </Card>
          </aside>

          <section className="flex-1">
            {paginated.length === 0 ? (
              <Typography className="text-center text-gray-500">Ni najdenih izdelkov.</Typography>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {paginated.map((p, index) => {
                    const hasDiscount = p.actionPrice != null && p.actionPrice !== p.price;
                    const discount = hasDiscount
                      ? Math.round(100 - (p.actionPrice / p.price) * 100)
                      : 0;

                    return (
                      <Card key={index} className="relative overflow-hidden">
                      
                        {hasDiscount && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md font-semibold z-10">
                            -{discount}%
                          </span>
                        )}

                        <CardHeader floated={false} className="h-36 flex items-center justify-center bg-white">
                          <img
                            src={
                              p.image?.startsWith("http")
                                ? p.image
                                : p.store === "Hofer"
                                ? "/img/HOFER.png"
                                : "/img/no-image.png"
                            }
                            alt={p.name}
                            className="max-h-28 w-auto object-contain"
                          />
                        </CardHeader>
                          
                        <CardBody className="pb-4">
                          <Typography variant="h5" className="mb-2 font-bold">
                            {p.name}
                          </Typography>
                          
                          <Typography variant="paragraph" className="mb-2 text-blue-gray-600">
                            {categorize(p)} – {p.store || "Neznana trgovina"}
                          </Typography>
                          
                          <Typography variant="h6" className="mb-2 font-semibold flex items-center gap-2">
                            {hasDiscount ? (
                              <>
                                <span className="line-through text-gray-500">
                                  {(parseFloat(p.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                                </span>
                                <span className="text-red-600 font-bold">
                                  {(parseFloat(p.actionPrice?.toString().replace(",", ".")) || 0).toFixed(2)} €
                                </span>
                              </>
                            ) : (
                              <span className="text-black font-bold">
                                {(parseFloat(p.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                              </span>
                            )}

                            {p.avgRating > 0 && (
                              <div className="flex justify-end">
                                <span className="text-yellow-400 flex items-center gap-1">
                                  {p.avgRating.toFixed(1)}
                                  <StarIcon className="h-6 w-6 text-yellow-400" />
                                </span>
                              </div>
                            )}
                          </Typography>
                          
                          <div className="mb-2">
                            <RouterLink to={`/products/${p._id}`}>
                              <Button size="sm" className="w-full">
                                Več
                              </Button>
                            </RouterLink>
                          </div>
                          
                          {user && (
                            <div className="mb-4">
                              <Button
                                size="sm"
                                color="green"
                                className="w-full"
                                onClick={() => openDialog(p)}
                              >
                                Dodaj v seznam
                              </Button>
                            </div>
                          )}

                          <br />
                        
                          <Typography variant="paragraph" className="mb-4 text-blue-gray-600">
                            Cena posodobljena: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('sl-SI') : "ni podatka"}
                            <UpdatedBadge updatedAt={p.updatedAt} />
                          </Typography>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
                {renderPagination()}
                <div className="h-20" />
              </>
            )}
          </section>
        </div>

        <Dialog open={showDialog} handler={() => setShowDialog(false)}>
          <DialogHeader>Dodaj v nakupovalni seznam</DialogHeader>
          <DialogBody>
            <Typography className="mb-2">Izberi seznam:</Typography>
            <Select
              value={selectedListId}
              onChange={(val) => setSelectedListId(val)}
              label="Seznam"
            >
              {userLists.map((list) => (
                <Option key={list.id} value={list.id}>
                  {list.name}
                </Option>
              ))}
            </Select>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" color="red" onClick={() => setShowDialog(false)} className="mr-2">
              Prekliči
            </Button>
            <Button
              color="green"
              onClick={async () => {
                if (selectedProduct && selectedListId) {
                  await addItemToList(auth.currentUser.uid, selectedListId, selectedProduct);
                  setShowDialog(false);
                }
              }}
            >
              Dodaj
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </>
  );
}

export default Products;