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
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

             {/* Seznam izdelkov */}
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


            </CardBody>
          </Card>
        </div>
    
      )}
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
