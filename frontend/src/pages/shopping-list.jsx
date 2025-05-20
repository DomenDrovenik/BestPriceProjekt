import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Typography,
  Input,
  Button,
  Checkbox,
  IconButton,
} from "@material-tailwind/react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

export function ShoppingList() {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newListName, setNewListName] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("bestprice-shopping-lists");
    if (stored) {
      const parsed = JSON.parse(stored);
      setLists(parsed);
      if (parsed.length > 0) {
        setSelectedListId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bestprice-shopping-lists", JSON.stringify(lists));
  }, [lists]);

  const currentList = lists.find((list) => list.id === selectedListId);

  const createNewList = () => {
    const name = newListName.trim();
    if (!name) return;
    const newList = {
      id: Date.now().toString(),
      name,
      items: [],
    };
    const updated = [...lists, newList];
    setLists(updated);
    setSelectedListId(newList.id);
    setNewListName("");
  };

  const deleteList = (id) => {
    const updated = lists.filter((list) => list.id !== id);
    setLists(updated);
    if (selectedListId === id && updated.length > 0) {
      setSelectedListId(updated[0].id);
    } else if (updated.length === 0) {
      setSelectedListId("");
    }
  };

  const saveItem = () => {
    const name = newItemName.trim();
    const amount = newItemAmount.trim();
    if (!name || !currentList) return;

    let updatedLists;
    if (editingItemId) {
      updatedLists = lists.map((list) =>
        list.id === selectedListId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === editingItemId ? { ...item, name, amount } : item
              ),
            }
          : list
      );
      setEditingItemId(null);
    } else {
      updatedLists = lists.map((list) =>
        list.id === selectedListId
          ? {
              ...list,
              items: [...list.items, { id: Date.now(), name, amount, done: false }],
            }
          : list
      );
    }

    setLists(updatedLists);
    setNewItemName("");
    setNewItemAmount("");
  };

  const toggleDone = (itemId) => {
    const updatedLists = lists.map((list) =>
      list.id === selectedListId
        ? {
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item
            ),
          }
        : list
    );
    setLists(updatedLists);
  };

  const removeItem = (itemId) => {
    const updatedLists = lists.map((list) =>
      list.id === selectedListId
        ? {
            ...list,
            items: list.items.filter((item) => item.id !== itemId),
          }
        : list
    );
    setLists(updatedLists);
  };

  return (
    <>
      {/* Naslovni blok */}
      <div className="relative flex h-[50vh] content-center items-center justify-center pt-16 pb-16">
        <div className="absolute top-0 h-full w-full bg-[url('/img/vozicek.jpg')] bg-cover bg-center" />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
          <div className="flex flex-wrap items-center">
            <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
              <Typography variant="h1" color="white" className="mb-6 font-black">
                Tvoji nakupovalni seznami
              </Typography>
              <Typography variant="lead" color="white" className="opacity-80">
                Klikni na seznam, da ga odpreš.
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Seznami kot kartice */}
      <div className="container mx-auto px-4 mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {lists.map((list) => (
          <Card
            key={list.id}
            className={`cursor-pointer transition-shadow ${
              selectedListId === list.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
            }`}
            onClick={() => setSelectedListId(list.id)}
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

      {/* Podrobnosti izbranega seznama */}
      <div className="max-w-3xl mx-auto mt-8 px-4">
        <div className="flex gap-2 mb-4">
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Ime novega seznama..."
          />
          <Button onClick={createNewList}>Ustvari seznam</Button>
        </div>

        {currentList && (
          <Card>
            <CardBody className="space-y-4">
              <Typography variant="h5">{currentList.name}</Typography>

              {/* Vnos izdelka */}
              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                <div className="w-full sm:w-[50%]">
                  <Input
                    size="sm"
                    autoFocus={editingItemId !== null}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveItem()}
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
              {currentList.items.length === 0 ? (
                <Typography color="gray" className="text-center italic">
                  Seznam je prazen.
                </Typography>
              ) : (
                <ul className="space-y-2">
                  {[...currentList.items]
                    .sort((a, b) => a.done - b.done) // Neopravljen -> opravljen
                    .map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <Checkbox
                          label={
                            <Typography
                              variant="small"
                              className={item.done ? "line-through text-gray-500" : ""}
                            >
                              {item.name}
                              {item.amount ? ` – ${item.amount}` : ""}
                              {editingItemId === item.id && (
                                <span className="italic text-blue-500 ml-1">(urejaš)</span>
                              )}
                            </Typography>
                          }
                          checked={item.done}
                          onChange={() => toggleDone(item.id)}
                        />
                        <div className="flex gap-1">
                          <IconButton
                            size="sm"
                            color="blue"
                            onClick={() => {
                              setNewItemName(item.name);
                              setNewItemAmount(item.amount);
                              setEditingItemId(item.id);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            size="sm"
                            color="red"
                            onClick={() => removeItem(item.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Spodnji razmik */}
      <div className="h-20" />
    </>
  );
}

export default ShoppingList;
