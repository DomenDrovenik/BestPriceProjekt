import React, { useState, useEffect, useRef } from "react";
import {
  Card, CardBody, Typography, Input, Button, Checkbox, IconButton
} from "@material-tailwind/react";
import { TrashIcon, PencilIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { auth, firestore } from "../firebase";
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { Dialog, DialogHeader, DialogBody, DialogFooter, Textarea } from "@material-tailwind/react";
// import html2pdf from "html2pdf.js";


export function ShoppingList() {
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newListName, setNewListName] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const inputRef = useRef();
  const navigate = useNavigate();

  const currentList = lists.find((list) => list.id === selectedListId);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        fetchLists(firebaseUser.uid);
      } else {
        setUser(null);
        setLists([]);
        setSelectedListId("");
      }
    });
    return () => unsubscribe();
  }, []);

 const fetchLists = async (uid) => {
  const snapshot = await getDocs(collection(firestore, "users", uid, "lists"));
  const data = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => Number(b.id) - Number(a.id)); // sortiraj po ID, ki je timestamp

  setLists(data);
  if (data.length > 0) setSelectedListId(data[0].id);
};


  const createNewList = async () => {
    if (!user) return;
    const name = newListName.trim();
    if (!name) return;

    const newListId = Date.now().toString();
    const newList = { name, items: [] };

    await setDoc(doc(firestore, "users", user.uid, "lists", newListId), newList);

    const updated = [...lists, { id: newListId, ...newList }];
    setLists(updated);
    setSelectedListId(newListId);
    setNewListName("");
  };

  const deleteList = async (id) => {
    if (!user) return;
    await deleteDoc(doc(firestore, "users", user.uid, "lists", id));
    const updated = lists.filter((list) => list.id !== id);
    setLists(updated);
    setSelectedListId(updated.length > 0 ? updated[0].id : "");
  };

  const saveItem = async () => {
    if (!user || !currentList) return;
    const name = newItemName.trim();
    const amount = newItemAmount.trim();
    if (!name) return;

    if (currentList.items.some(item => item.name === name && item.id !== editingItemId)) {
      alert("Ta izdelek je že v seznamu.");
      return;
    }

    let updatedItems;
    if (editingItemId) {
      updatedItems = currentList.items.map(item =>
        item.id === editingItemId ? { ...item, name, amount } : item
      );
      setEditingItemId(null);
    } else {
      updatedItems = [...currentList.items, { id: Date.now(), name, amount, done: false }];
    }

    await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
      items: updatedItems,
    });

    setLists((prev) =>
      prev.map((list) => list.id === selectedListId ? { ...list, items: updatedItems } : list)
    );
    setNewItemName("");
    setNewItemAmount("");
  };

  const toggleDone = async (itemId) => {
    if (!user || !currentList) return;
    const updatedItems = currentList.items.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
      items: updatedItems,
    });
    setLists((prev) =>
      prev.map((list) => list.id === selectedListId ? { ...list, items: updatedItems } : list)
    );
  };

  const removeItem = async (itemId) => {
    if (!user || !currentList) return;
    const updatedItems = currentList.items.filter(item => item.id !== itemId);
    await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
      items: updatedItems,
    });
    setLists((prev) =>
      prev.map((list) => list.id === selectedListId ? { ...list, items: updatedItems } : list)
    );
  };

  const handleListChange = (id) => {
    if (editingItemId) {
      const confirm = window.confirm("Urejaš izdelek. Želiš zavreči spremembe?");
      if (!confirm) return;
      setEditingItemId(null);
      setNewItemName("");
      setNewItemAmount("");
    }
    setSelectedListId(id);
  };

  const handleLogin = () => {
  navigate("/sign-in");
};

 const items = currentList?.items ?? [];

const itemsToRender = [
  ...items.filter(i => !i.done),
  ...(items.some(i => i.done) ? [{ separator: true }] : []),
  ...items.filter(i => i.done),
];

const formatListAsText = () => {
  if (!currentList) return "";

  const lines = [`Seznam: ${currentList.name}`, ""];

  const unchecked = currentList.items.filter(i => !i.done);
  const checked = currentList.items.filter(i => i.done);

  if (unchecked.length) {
    lines.push("Potrebno kupiti:");
    unchecked.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}${item.amount ? ` – ${item.amount}` : ""}${item.store ? ` (${item.store})` : ""}`);
    });
    lines.push("");
  }

  if (checked.length) {
    lines.push("Opravljeno:");
    checked.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}${item.amount ? ` – ${item.amount}` : ""}${item.store ? ` (${item.store})` : ""}`);
    });
  }

  return lines.join("\n");
};


const copyListToClipboard = () => {
  const text = formatListAsText();
  navigator.clipboard.writeText(text).then(() => {
    alert("Seznam je bil kopiran v odložišče!");
  }).catch(() => {
    alert("Napaka pri kopiranju.");
  });
};

const downloadAsTxt = () => {
  const text = formatListAsText();
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentList.name || "seznam"}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadAsPdf = () => {
  const text = formatListAsText();
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(text, 180);
  pdf.text(lines, 10, 10);
  pdf.save(`${currentList.name || "seznam"}.pdf`);
};

const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
const [pdfText, setPdfText] = useState("");

const openPdfPreview = () => {
  const text = formatListAsText();
  setPdfText(text);
  setPdfPreviewOpen(true);
};

const downloadEditedPdf = () => {
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(pdfText, 180);

  pdf.setFont("Helvetica", "");
  pdf.setFontSize(12);
  pdf.setTextColor(40);

  pdf.text(`Nakupovalni seznam: ${currentList.name}`, 10, 15);
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.5);
  pdf.line(10, 17, 200, 17);

  pdf.text(lines, 10, 25);
  pdf.save(`${currentList.name || "seznam"}.pdf`);
  setPdfPreviewOpen(false);
};

const itemsGroupedByStore = () => {
  if (!currentList) return {};

  const groups = {
    __done__: [],
    __noStore__: {},
  };

  currentList.items.forEach((item) => {
    if (item.done) {
      groups.__done__.push(item);
    } else if (item.store) {
      if (!groups[item.store]) groups[item.store] = [];
      groups[item.store].push(item);
    } else {
      if (!groups.__noStore__["Drugo"]) groups.__noStore__["Drugo"] = [];
      groups.__noStore__["Drugo"].push(item);
    }
  });

  return groups;
};

const storeDiscounts = {
   "Mercator": {
    discount: 0.10,
    note: "10 % ob sredah za upokojence, ali 25 % na en izdelek ob petkih in sobotah, če je vrednost preostale košarice več kot 5 €"
  },
 "Tuš": {
    discount: 0.10,
    note: "10 % ob ponedeljkih za člane Tuš kluba, ali 25 % na en izdelek ob torkih in četrtkih za člane Tuš kluba"
  },
  "Lidl": {
    discount: 0,
    note: "Digitalni kuponi v aplikaciji Lidl Plus"
  },
  "Hofer": {
    discount: 0,
    note: "Občasne vikend akcije"
  },
  "Jager": {
    discount: 0.10,
    note: "10 % vrednosti nakupa se vrne na Jager kartico ugodnosti in jo lahko koristiš ob naslednjem nakupu."
  }
};

// Pretvori npr. "500 g", "1 kg", "750 ml", "1.5 l" v številsko vrednost v kg ali l
function normalizeAmount(quantity) {
  if (!quantity || typeof quantity !== "string") return null;

  const match = quantity.match(/([\d.,]+)\s*(g|kg|ml|l)/i);
  if (!match) return null;

  let [_, numStr, unit] = match;
  let amount = parseFloat(numStr.replace(",", "."));
  if (isNaN(amount)) return null;

  unit = unit.toLowerCase();
  if (unit === "g") return amount / 1000;
  if (unit === "ml") return amount / 1000;
  if (unit === "kg" || unit === "l") return amount;

  return null;
}

// Glavna funkcija za razvrščanje po ceni na enoto
function sortByUnitPrice(products) {
  return [...products].sort((a, b) => {
    const aQty = normalizeAmount(a.quantity);
    const bQty = normalizeAmount(b.quantity);

    const aPrice = parseFloat(a.actionPrice || a.price || "0");
    const bPrice = parseFloat(b.actionPrice || b.price || "0");

    const aPerUnit = aQty ? aPrice / aQty : Infinity;
    const bPerUnit = bQty ? bPrice / bQty : Infinity;

    if (aPerUnit !== bPerUnit) return aPerUnit - bPerUnit;

    // če imata enako €/kg, primerjaj skupno ceno kot fallback
    return aPrice - bPrice;
  });
}


const [isPensioner, setIsPensioner] = useState(false);
const itemsWith25 = items.filter(i => i.extraDiscount25);
const totalRaw = items.reduce((sum, i) => sum + i.price * parseQuantityMultiplier(i.amount), 0);
const [mercatorPromo, setMercatorPromo] = useState("none");
const [mercatorDialogOpen, setMercatorDialogOpen] = useState(false);
const [selectedMercatorOption, setSelectedMercatorOption] = useState("none"); // 'none' | 'pension' | '25on1'
const [selectedItemId25, setSelectedItemId25] = useState(null);

const [tusDialogOpen, setTusDialogOpen] = useState(false);
const [selectedTusOption, setSelectedTusOption] = useState("none"); // 'none' | 'club' | '25on1'
const [selectedItemId25Tus, setSelectedItemId25Tus] = useState(null);


const [searchResults, setSearchResults] = useState([]);
const [searchQuery, setSearchQuery] = useState("");

useEffect(() => {
  const fetchSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/search?name=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
       const sortedData = sortByUnitPrice(data); 
    setSearchResults(sortedData);             
    } catch (err) {
      console.error("Napaka pri iskanju izdelkov:", err);
      setSearchResults([]);
    }
  };

  fetchSearch(); 

}, [searchQuery]); 

const allItemNamesInOtherLists = new Set(
  lists
    .filter((list) => list.id !== selectedListId)
    .flatMap((list) => list.items.map((item) => item.name.trim().toLowerCase()))
);

const saveItemFromSearch = async (product) => {
  if (!user || !currentList) return;

  if (currentList.items.some(item => item.name === product.name)) {
    alert("Ta izdelek je že v seznamu.");
    return;
  }

const newItem = {
  id: Date.now(),
  name: product.name,
  amount: "",
  done: false,
  store: product.store || "",
  price: product.priceNum ?? product.price ?? 0, 
};



  const updatedItems = [...currentList.items, newItem];
  await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
    items: updatedItems,
  });

  setLists((prev) =>
    prev.map((list) =>
      list.id === selectedListId ? { ...list, items: updatedItems } : list
    )
  );
};
const storeMap = {
  merkator: "Mercator",
  jager: "Jager",
  tus: "Tuš",
  lidl: "Lidl",
  hofer: "Hofer"
};

const getStoreName = (image = "") => {
  const src = image.toLowerCase();
  return Object.entries(storeMap).find(([key]) => src.includes(key))?.[1] || "Trgovina";
};

const [localRecommendations, setLocalRecommendations] = useState([]);

const fetchBestMatches = async (items) => {
  const results = [];

  for (const item of items) {
    try {
      const res = await fetch(
        `http://localhost:3000/api/search?name=${encodeURIComponent(item.name)}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const best = sortByUnitPrice(data)[0];
        results.push({
          name: best.name,
          price: best.priceNum,
          store: best.store,
          quantity: best.quantity,
        });
      }
    } catch (err) {
      console.error("Napaka pri iskanju za priporočilo:", item.name, err);
    }
  }

  return results;
};

useEffect(() => {
  const generateAndFetchRecommendations = async () => {
    if (!user || !lists.length || !selectedListId) return;

    const itemMap = new Map();

    // Preglej vse sezname razen trenutno izbranega
    lists.forEach((list) => {
      if (list.id === selectedListId) return;

      (list.items || []).forEach((item) => {
        const key = item.name?.trim().toLowerCase();
        if (!key) return;

        const count = itemMap.get(key)?.count || 0;
        itemMap.set(key, {
          name: item.name.trim(),
          count: count + 1
        });
      });
    });

    // Pridobi 5 najpogosteje uporabljenih izdelkov
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Pridobi najboljše cene / podrobnosti zanje
    const detailed = await fetchBestMatches(topItems);

    setLocalRecommendations(detailed);
  };

  generateAndFetchRecommendations();
}, [user, lists, selectedListId]);



useEffect(() => {
  if (
    selectedMercatorOption === "25on1" &&
    currentList &&
    !selectedItemId25
  ) {
    const mercatorItems = currentList.items.filter(
      (i) => i.store === "Mercator" && i.price
    );
    if (mercatorItems.length > 0) {
      const mostExpensive = mercatorItems.reduce((a, b) =>
        a.price > b.price ? a : b
      );
      setSelectedItemId25(mostExpensive.id);
    }
  }
}, [selectedMercatorOption, currentList]);

useEffect(() => {
  if (
    selectedTusOption === "25on1" &&
    currentList &&
    !selectedItemId25Tus
  ) {
    const tusItems = currentList.items.filter(
      (i) => i.store === "Tuš" && i.price
    );
    if (tusItems.length > 0) {
      const mostExpensive = tusItems.reduce((a, b) =>
        a.price > b.price ? a : b
      );
      setSelectedItemId25Tus(mostExpensive.id);
    }
  }
}, [selectedTusOption, currentList]);


const [showRecommendations, setShowRecommendations] = useState(false);

function parseQuantityMultiplier(amount) {
  if (!amount) return 1;
  const match = amount.match(/^(\d+)\s*x$/i);
  if (match) {
    const multiplier = parseInt(match[1], 10);
    return isNaN(multiplier) ? 1 : multiplier;
  }
  return 1;
}


  return (
    <>
      {/* Naslovni blok */}
<div className="relative flex h-[50vh] content-center items-center justify-center pt-16 pb-16">
  <div className="absolute top-0 h-full w-full bg-[url('/img/vozicek.jpg')] bg-cover bg-center" />
  <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
  <div className="max-w-8xl container relative mx-auto">
    <div className="flex flex-wrap items-center">
      <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12 text-white">
        {user ? (
          <>
            <Typography variant="h1" color="white" className="mb-6 font-black">
              Tvoji nakupovalni seznami
            </Typography>
            <Typography variant="lead" color="white" className="opacity-80">
              Klikni na seznam, da ga odpreš.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h1" color="white" className="mb-6 font-black">
              Nakupovalni seznami
            </Typography>
            <Typography variant="paragraph" color="white" className="opacity-80 mb-4">
              Za ustvarjanje in pregled se prijavi.
            </Typography>
            <Button
              onClick={handleLogin}
              className="bg-white text-black font-semibold flex items-center gap-2 mx-auto"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" /> Prijava
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
</div>


      {/* Seznami */}
      <div className="container mx-auto px-4 mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {(user ? lists : []).map((list) => (
          <Card
            key={list.id}
            className={`cursor-pointer ${selectedListId === list.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"}`}
            onClick={() => handleListChange(list.id)}
          >
            <CardBody className="flex justify-between items-start">
              <div>
                <Typography variant="h6">{list.name}</Typography>
                <Typography variant="small" color="gray">
                  {list.items.length} izdelkov
                </Typography>
              </div>
              <IconButton
                variant="text"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteList(list.id);
                }}
              >
                <TrashIcon className="h-5 w-5" />
              </IconButton>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="max-w-3xl mx-auto mt-8 px-4">
        {!user && (
          <Typography color="red" className="mb-2 text-sm font-semibold text-center uppercase">
            ZA USTVARJANJE NAKUPOVALNIH SEZNAMOV MORAŠ BITI PRIJAVLJEN
          </Typography>
        )}
        <div className="flex gap-2">
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Ime novega seznama..."
            disabled={!user}
          />
          <Button
            onClick={createNewList}
            disabled={!user || !newListName.trim()}
            className="px-6 py-2 text-white font-bold rounded-lg whitespace-nowrap"
          >
            Ustvari seznam
          </Button>
        </div>
      </div>


      {/* Izpis podrobnosti izbranega seznama */}
      {user && currentList && (
        <div className="max-w-3xl mx-auto px-4 mt-8"> 
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-2">
              </div>
              <Typography variant="h5">{currentList.name}</Typography>
            
              <div className="flex flex-wrap gap-2">
                <Button size="sm" color="blue" onClick={copyListToClipboard}>
                  Kopiraj
                </Button>
                <Button size="sm" color="green" onClick={downloadAsTxt}>
                  Prenesi TXT
                </Button>
                <Button size="sm" color="red" onClick={openPdfPreview}>
                  Predogled & izvoz PDF
                </Button>

              </div>

              {/* Vnos izdelka */}
              {/* Iskalnik – nova vrstica nad vnosnim poljem */}
              <div className="w-full relative">
        <Input
          size="lg"
          label=""
          labelProps={{ className: "hidden" }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Išči izdelek po trgovinah (npr. Coca-Cola)"
          className="w-full"
        />

      {searchQuery.length > 1 && searchResults.length > 0 && (
      <ul className="absolute z-20 bg-white border rounded shadow mt-1 w-full max-h-60 overflow-auto">
      {searchResults.slice(0, 10).map((product, index) => {
      const isInOtherLists = allItemNamesInOtherLists.has(product.name.trim().toLowerCase());

  return (
    <li
      key={product._id}
      className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
      onClick={() => {
        setNewItemName(product.name);
        setNewItemAmount("");
        setSearchQuery("");
        setSearchResults([]);
        saveItemFromSearch(product);
      }}
    >
      <div className="font-semibold flex justify-between items-center">
        {product.name}
        <div className="flex flex-col items-end text-xs ml-2">
          {index === 0 && (
            <span className="text-green-600 font-bold">najcenejše</span>
          )}
          {isInOtherLists && (
            <span className="text-red-500 italic">večkrat že dodano</span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-600">
        {product.store} – {product.priceNum.toFixed(2)} €{" "}
        {product.quantity && `(${product.quantity})`}
      </div>
    </li>
  );
})}

            </ul>
          )}
        </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                <div className={`w-full sm:w-[50%] ${editingItemId ? "bg-blue-50" : ""}`}>
                  <Input
                    size="sm"
                    ref={inputRef}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveItem();
                      if (e.key === "Escape") {
                        setEditingItemId(null);
                        setNewItemName("");
                        setNewItemAmount("");
                      }
                    }}
                    placeholder="Ime izdelka..."
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-[30%]">
                  <Input
                    size="sm"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveItem()}
                    placeholder="Količina (npr. 2x, 500g)"
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-[20%] flex justify-end">
                  <Button
                    size="sm"
                    onClick={saveItem}
                    className="w-full sm:w-auto sm:px-4 sm:h-[36px]"
                  >
                    {editingItemId ? "Posodobi" : "Dodaj"}
                  </Button>
                </div>

              </div>
{localRecommendations.length > 0 && currentList && (
  <div className="max-w-3xl mx-auto mt-12 px-4">
    <button
      onClick={() => setShowRecommendations(prev => !prev)}
      className="text-left w-full"
    >
      <Typography variant="h5" className="mb-4 cursor-pointer text-blue-800 hover:underline">
        Priporočeni izdelki {showRecommendations ? "▲" : "▼"}
      </Typography>
    </button>

    {showRecommendations && (
      <ul className="space-y-2">
        {localRecommendations.map((item, index) => {
          const alreadyInList = currentList.items.some(i => i.name === item.name);
          return (
            <li
              key={index}
              className="flex justify-between items-center p-2 bg-gray-100 rounded shadow-sm"
            >
              <div>
                <span className="font-semibold">{item.name}</span>{" "}
                {item.store && (
                  <span className="text-gray-600 ml-1">({item.store})</span>
                )}
                {item.quantity && (
                  <span className="text-sm text-gray-500 ml-1">
                    ({item.quantity})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-black-700">{item.price.toFixed(2)} €</span>
                {!alreadyInList ? (
                  <Button
                    size="sm"
                    onClick={() => saveItemFromSearch(item)}
                  >
                    Dodaj
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500 italic">že v seznamu</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
)}

             {/* Seznam izdelkov */}
    {currentList.items.length === 0 ? (
      <Typography color="gray" className="text-center italic">
        Seznam je prazen.
      </Typography>
    ) : (
      <>
        {/* Trgovine (abecedno) */}
        {Object.keys(itemsGroupedByStore())
          .filter(key => key !== "__done__" && key !== "__noStore__")
          .sort()
          .map(store => (
            <div key={store} className="mb-4">
              <Typography variant="small" className="font-bold text-gray-700 mb-1 border-b pb-1">
                {store}
              </Typography>
              <ul className="space-y-2">
                {itemsGroupedByStore()[store].map((item) => (
                  <li key={item.id} className="flex justify-between items-center">
                    <Checkbox
                      checked={item.done}
                      onChange={() => toggleDone(item.id)}
                      label={
                        <span>
                        {item.name}
                        {item.amount ? ` – ${item.amount}` : ""}
                        {item.price
                          ? ` – ${(item.price * parseQuantityMultiplier(item.amount)).toFixed(2)} €`
                          : ""}
                                                  {editingItemId === item.id && (
                            <span className="ml-2 text-blue-500 italic">(urejaš)</span>
                          )}
                        </span>
                      }
                    />

                    <div className="flex gap-1">
                      <IconButton size="sm" color="blue" onClick={() => {
                        setNewItemName(item.name);
                        setNewItemAmount(item.amount);
                        setEditingItemId(item.id);
                      }}>
                        <PencilIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton size="sm" color="red" onClick={() => removeItem(item.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

    {/* Drugo (artikli brez trgovine) */}
    {itemsGroupedByStore().__noStore__["Drugo"]?.length > 0 && (
      <div className="mb-4">
        <Typography variant="small" className="font-bold text-gray-700 mb-1 border-b pb-1">
          Drugo
        </Typography>
        <ul className="space-y-2">
          {itemsGroupedByStore().__noStore__["Drugo"].map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <Checkbox
                checked={item.done}
                onChange={() => toggleDone(item.id)}
                label={
                  <span>
                    {item.name}
                    {item.amount ? ` – ${item.amount}` : ""}
                    {item.price
                      ? ` – ${(item.price * parseQuantityMultiplier(item.amount)).toFixed(2)} €`
                      : ""}
                    {editingItemId === item.id && (
                      <span className="ml-2 text-blue-500 italic">(urejaš)</span>
                    )}
                  </span>
                }
              />
              <div className="flex gap-1">
                <IconButton size="sm" color="blue" onClick={() => {
                  setNewItemName(item.name);
                  setNewItemAmount(item.amount);
                  setEditingItemId(item.id);
                }}>
                  <PencilIcon className="h-4 w-4" />
                </IconButton>
                <IconButton size="sm" color="red" onClick={() => removeItem(item.id)}>
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Opravljeno */}
    {itemsGroupedByStore().__done__.length > 0 && (
      <div className="mt-6 pt-4 border-t">
        <Typography variant="small" className="font-bold text-gray-700 mb-1">
          Opravljeno
        </Typography>
        <ul className="space-y-2">
          {itemsGroupedByStore().__done__.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <Checkbox
                checked={item.done}
                onChange={() => toggleDone(item.id)}
                label={
                  <span className="line-through text-gray-500">
                    {item.name}
                    {item.amount ? ` – ${item.amount}` : ""}
                    {item.price
                      ? ` – ${(item.price * parseQuantityMultiplier(item.amount)).toFixed(2)} €`
                      : ""}

                    {item.store && (
                      <span className="text-sm italic ml-2">({item.store})</span>
                    )}
                    {editingItemId === item.id && (
                      <span className="ml-2 text-blue-500 italic">(urejaš)</span>
                    )}
                  </span>
                }
              />
              <div className="flex gap-1">
                <IconButton size="sm" color="blue" onClick={() => {
                  setNewItemName(item.name);
                  setNewItemAmount(item.amount);
                  setEditingItemId(item.id);
                }}>
                  <PencilIcon className="h-4 w-4" />
                </IconButton>
                <IconButton size="sm" color="red" onClick={() => removeItem(item.id)}>
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
)}

{currentList.items.length > 0 && (
  <div className="mt-8 pt-4 border-t space-y-6">
    <Typography variant="h5" className="font-semibold mb-2">
      Skupna vrednost po trgovinah:
    </Typography>
    
   <Button
      color="blue-gray"
      variant="outlined"
      size="sm"
      className="mr-2"
      onClick={() => setMercatorDialogOpen(true)}
    >
      Izberi Mercator popust
    </Button>
    <Button
      color="blue-gray"
      variant="outlined"
      size="sm"
      onClick={() => setTusDialogOpen(true)}
    >
      Izberi Tuš popust
    </Button>


    {Object.entries(
      currentList.items
        .filter(i => !i.done && i.store && i.price)
        .reduce((acc, item) => {
          const store = item.store;
          if (!acc[store]) acc[store] = [];
          acc[store].push(item);
          return acc;
        }, {})
    ).map(([store, items]) => {
const total = items.reduce(
  (sum, i) => sum + i.price * parseQuantityMultiplier(i.amount),
  0
);
      const discountInfo = storeDiscounts[store];
      const discount = discountInfo?.discount || 0;

      const totalWithDiscount = (() => {
       if (store === "Tuš") {
const totalRaw = items.reduce((sum, i) => sum + i.price * parseQuantityMultiplier(i.amount), 0);
    const item25 = items.find(i => i.extraDiscount25Tus);
    if (selectedTusOption === "25on1" && item25) {
  return items.reduce((sum, item) => {
    let price = item.price;
    if (item.id === item25.id) price *= 0.75;
    price *= parseQuantityMultiplier(item.amount);
    return sum + price;
  }, 0);
}

   if (selectedTusOption === "club" && totalRaw > 20) {
  return items.reduce((sum, item) => {
    return sum + item.price * 0.9 * parseQuantityMultiplier(item.amount);
  }, 0);
}

    return totalRaw;
  }

     if (store !== "Mercator") {
  return items.reduce((sum, item) => {
    let price = item.price;
    price *= parseQuantityMultiplier(item.amount);
    if (discount > 0) price *= (1 - discount);
    return sum + price;
  }, 0);
}

      if (store === "Jager") {
        const totalRaw = items.reduce((sum, i) => sum + i.price * parseQuantityMultiplier(i.amount), 0);
        const has10Back = totalRaw > 20;

        // vrednost nakupa ostane nespremenjena – ni popusta, je vračilo
        return totalRaw;
      }

        const totalRaw = items.reduce((sum, i) => sum + i.price * parseQuantityMultiplier(i.amount), 0);
        const pensionerDiscount = selectedMercatorOption === "pension" ? 0.9 : 1;
        const itemsWith25 = items.filter(i => i.extraDiscount25);
        const item25 = itemsWith25.length > 0 ? itemsWith25[0] : null;

        // 25 % na en izdelek – če omogočen, samo 1 izdelek označen in preostanek > 5 €
      if (
        selectedMercatorOption === "25on1" &&
        item25 &&
        itemsWith25.length === 1 &&
        totalRaw > 5
      )
      {
          return items.reduce((sum, item) => {
            let price = item.price;
if (item.id === item25.id) price *= 0.75;
price *= parseQuantityMultiplier(item.amount);
price *= pensionerDiscount;

            return sum + price;
          }, 0);
        }

        // drugače le upokojenski popust
return items.reduce((sum, item) =>
  sum + item.price * parseQuantityMultiplier(item.amount) * pensionerDiscount, 0);
      })();



      return (
        <div key={store}>
          <Typography variant="h6" className="font-medium">
            {store}
          </Typography>
          <Typography variant="small" className="text-gray-800">
            Skupaj: {total.toFixed(2)} €
          </Typography>

          {store !== "Jager" && (
            <Typography variant="small" className="text-green-700">
              S popustom: {totalWithDiscount.toFixed(2)} €
            </Typography>
          )}

          {store === "Tuš" && (
            <>
              <Typography variant="small" className="text-gray-800 font-medium">
                Uporabljen popust:{" "}
                {selectedTusOption === "club"
                  ? "10 % za člane Tuš kluba"
                  : selectedTusOption === "25on1"
                  ? "25 % na izdelek"
                  : "brez popusta"}
              </Typography>

            {selectedTusOption === "25on1" && selectedItemId25Tus && (
            <Typography variant="small" className="text-blue-gray-700 italic">
              Popust velja za:{" "}
              {
                currentList.items.find((i) => i.id === selectedItemId25Tus)?.name ||
                "neznan izdelek"
              }
                </Typography>
              )}


              {selectedTusOption === "25on1" && (
                <Typography variant="small" className="text-blue-800 italic mt-2">
                  25 % popust v Tušu velja <b>ob torkih in četrtkih</b>.
                </Typography>
              )}


              {selectedTusOption === "club" && total <= 20 && (
            <Typography variant="small" className="text-red-700 italic">
              Vrednost nakupa mora biti več kot 20 €, da se uveljavi 10 % Tuš klub popust!
            </Typography>
          )}
          <Typography variant="small" className="text-blue-gray-600 italic mt-1">
            Za več akcij obišči:{" "}
            <a
              href="https://www.tus.si/katalog/tedenski-kuponi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              povezava do drugih akcij
            </a>
          </Typography>

            </>
          )}

         {store === "Jager" && (
            <>
              <Typography variant="small" className="text-gray-800 font-medium">
                Uporabljen popust: brez neposrednega popusta – vračilo 10 % na kartico
              </Typography>

              {total > 20 ? (
                <Typography variant="small" className="text-green-700 italic">
                  Vračilo na kartico: {(total * 0.10).toFixed(2)} €
                </Typography>
              ) : (
                <Typography variant="small" className="text-red-700 italic">
                  Vrednost nakupa mora presegati 20 €, da se uveljavi vračilo 10 % na kartico.
                </Typography>
              )}
              <Typography variant="small" className="text-blue-gray-600 italic mt-1">
            Za več akcij obišči:{" "}
            <a
              href="https://www.jagerklub.com/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              povezava do drugih akcij
            </a>
          </Typography>
            </>
          )}

          {store === "Mercator" && (
            <>
              <Typography variant="small" className="text-gray-800 font-medium">
                Uporabljen popust:{" "}
                {selectedMercatorOption === "pension"
                  ? "10 % za upokojence"
                  : selectedMercatorOption === "25on1"
                  ? "25 % na izdelek"
                  : "brez popusta"}
              </Typography>

              {selectedMercatorOption === "25on1" && selectedItemId25 && (
                <Typography variant="small" className="text-blue-gray-700 italic">
                  Popust velja za:{" "}
                  {
                    currentList.items.find((i) => i.id === selectedItemId25)?.name ||
                    "neznan izdelek"
                  }
                </Typography>
              )}

              {selectedMercatorOption === "25on1" && itemsWith25.length > 1 && (
                <Typography variant="small" className="text-red-700 italic">
                  Samo en izdelek je lahko označen za 25 % popust!
                </Typography>
              )}

              {selectedMercatorOption === "25on1" && total <= 5 && itemsWith25.length > 0 && (
                <Typography variant="small" className="text-red-700 italic">
                  Košarica mora presegati 5 €, da se uveljavi 25 % popust!
                </Typography>
              )}
              <Typography variant="small" className="text-blue-gray-600 italic mt-1">
            Za več akcij obišči:{" "}
            <a
              href="https://www.mercator.si/akcije-in-ugodnosti/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              povezava do drugih akcij
            </a>
          </Typography>
      </>
      )}
          {discountInfo?.note && (
            <Typography variant="small" className="text-blue-gray-600 italic">
              {discountInfo.note}
            </Typography>
          )}

        {store === "Lidl" && (
          <Typography variant="small" className="text-blue-gray-600 italic mt-1">
            Za več informacij o kuponih si poglejte:{" "}
            <a
              href="https://www.lidl.si/c/lidl-plus/a10024188?channel=store&tabCode=Current_Sales_Week"
             target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Lidl Plus kuponi
            </a>
          </Typography>
        )}

        {store === "Hofer" && (
          <Typography variant="small" className="text-blue-gray-600 italic mt-1">
            Za več informacij aktualni ponudbi: {" "}
            <a
              href="https://www.hofer.si/sl/ponudba/tedenska-akcija.html"
             target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              povezava do aktualne akcije
            </a>
          </Typography>
        )}
        </div>
        );
        })}
      </div>
    )}
            </CardBody>
          </Card>
        </div>
    
      )}
    <Dialog open={mercatorDialogOpen} handler={() => setMercatorDialogOpen(false)} size="md">
      <DialogHeader>Izberi Mercator popust</DialogHeader>
      <DialogBody className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="pension"
              checked={selectedMercatorOption === "pension"}
              onChange={() => setSelectedMercatorOption("pension")}
            />
            10 % upokojenski popust
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="25on1"
              checked={selectedMercatorOption === "25on1"}
              onChange={() => setSelectedMercatorOption("25on1")}
            />
            25 % popust na en izdelek
          </label>
          {selectedMercatorOption === "25on1" && (
            <select
              value={selectedItemId25 || ""}
              onChange={(e) => setSelectedItemId25(Number(e.target.value))}
              className="mt-2 block w-full border px-2 py-1 rounded"
            >
            {items
            .filter(i => i.store === "Mercator")
            .map((item) => {
              const isSuggested = item.id === selectedItemId25;
              const label = `${item.name} ${item.price ? `– ${item.price.toFixed(2)} €` : ""}${isSuggested ? " (predlagano)" : ""}`;
              return (
                <option
                  key={item.id}
                  value={item.id}
                  style={isSuggested ? { fontWeight: "bold", color: "#1e3a8a" } : {}}
                >
                  {label}
                </option>
              );
            })}


            </select>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={() => setMercatorDialogOpen(false)}>
          Prekliči
        </Button>
        <Button
          color="blue"
          onClick={async () => {
            setIsPensioner(selectedMercatorOption === "pension");

            // nastavi 25% na izbrani izdelek (ostale počisti)
            const updatedItems = currentList.items.map((item) => {
              return {
                ...item,
                extraDiscount25: selectedMercatorOption === "25on1" && item.id === selectedItemId25,
              };
            });

            await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
              items: updatedItems,
            });

            setLists(prev =>
              prev.map(list =>
                list.id === selectedListId ? { ...list, items: updatedItems } : list
              )
            );

            setMercatorDialogOpen(false);
          }}
        >
          Shrani izbiro
        </Button>
      </DialogFooter>
    </Dialog>
    <Dialog open={tusDialogOpen} handler={() => setTusDialogOpen(false)} size="md">
      <DialogHeader>Izberi Tuš popust</DialogHeader>
      <DialogBody className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="club"
              checked={selectedTusOption === "club"}
              onChange={() => setSelectedTusOption("club")}
            />
            10 % popust za člane Tuš kluba (ob ponedeljkih)
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="25on1"
              checked={selectedTusOption === "25on1"}
              onChange={() => setSelectedTusOption("25on1")}
            />
            25 % popust na en izdelek (ob torkih in četrtkih)
          </label>
          {selectedTusOption === "25on1" && (
            <select
              value={selectedItemId25Tus || ""}
              onChange={(e) => setSelectedItemId25Tus(Number(e.target.value))}
              className="mt-2 block w-full border px-2 py-1 rounded"
            >
              {items
              .filter(i => i.store === "Tuš")
              .map((item) => {
                const isSuggested = item.id === selectedItemId25Tus;
                const label = `${item.name} ${item.price ? `– ${item.price.toFixed(2)} €` : ""}${isSuggested ? " (predlagano)" : ""}`;
                return (
                  <option
                    key={item.id}
                    value={item.id}
                    style={isSuggested ? { fontWeight: "bold", color: "#166534" } : {}}
                  >
                    {label}
                  </option>
                );
              })}

            </select>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={() => setTusDialogOpen(false)}>
          Prekliči
        </Button>
        <Button
          color="green"
          onClick={async () => {
            const updatedItems = currentList.items.map((item) => ({
              ...item,
              extraDiscount25Tus: selectedTusOption === "25on1" && item.id === selectedItemId25Tus,
            }));

            await updateDoc(doc(firestore, "users", user.uid, "lists", selectedListId), {
              items: updatedItems,
            });

            setLists(prev =>
              prev.map(list =>
                list.id === selectedListId ? { ...list, items: updatedItems } : list
              )
            );

            setTusDialogOpen(false);
          }}
        >
          Shrani izbiro
        </Button>
      </DialogFooter>
    </Dialog>


          <Dialog open={pdfPreviewOpen} handler={() => setPdfPreviewOpen(false)}>
      <DialogHeader>Predogled PDF seznama</DialogHeader>
      <DialogBody>
        <Textarea
          rows={10}
          value={pdfText}
          onChange={(e) => setPdfText(e.target.value)}
          className="font-mono"
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="text" color="gray" onClick={() => setPdfPreviewOpen(false)}>
          Prekliči
        </Button>
        <Button color="red" onClick={downloadEditedPdf}>
          Prenesi PDF
        </Button>
      </DialogFooter>
    </Dialog>

          <div className="h-20" />
        </>
      );
      
    }

export default ShoppingList;
