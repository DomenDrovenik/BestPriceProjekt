// src/views/ShoppingList.js
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
import { TrashIcon } from "@heroicons/react/24/outline";
import { PageTitle } from "@/widgets/layout";

export function ShoppingList() {
  const [newItem, setNewItem] = useState("");
  const [list, setList] = useState([]);

  // Načrtno naloži iz localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bestprice-shopping-list");
    if (stored) setList(JSON.parse(stored));
  }, []);

  // Shrani na vsako spremembo
  useEffect(() => {
    localStorage.setItem("bestprice-shopping-list", JSON.stringify(list));
  }, [list]);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setList((prev) => [
      ...prev,
      { id: Date.now(), name: trimmed, done: false },
    ]);
    setNewItem("");
  };

  const toggleDone = (id) => {
    setList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const removeItem = (id) => {
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
    <div className="relative flex h-[50vh] content-center items-center justify-center pt-16 pb-16">
        <div className="absolute top-0 h-full w-full bg-[url('/img/vozicek.jpg')] bg-cover bg-center" />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
          <div className="flex flex-wrap items-center">
            <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
              <Typography
                variant="h1"
                color="white"
                className="mb-6 font-black"
              >
                Tvoj nakupovalni seznam
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

      <Card className="max-w-md mx-auto mt-6">
        <CardBody className="space-y-4">
          {/* Vnos nove postavke */}
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Dodaj izdelek..."
            />
            <Button onClick={addItem}>Dodaj</Button>
          </div>

          {/* Seznam */}
          {list.length === 0 ? (
            <Typography color="gray" className="text-center">
              Seznam je prazen.
            </Typography>
          ) : (
            <ul className="space-y-2">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <Checkbox
                    label={
                      <Typography
                        variant="small"
                        className={item.done ? "line-through" : ""}
                      >
                        {item.name}
                      </Typography>
                    }
                    checked={item.done}
                    onChange={() => toggleDone(item.id)}
                  />
                  <IconButton
                    size="sm"
                    color="red"
                    onClick={() => removeItem(item.id)}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}

export default ShoppingList;