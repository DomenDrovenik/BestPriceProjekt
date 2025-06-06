// src/components/PriceAlertButton.jsx
import React, { useState,useEffect } from "react";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Typography,
  Checkbox
} from "@material-tailwind/react";
import { BellIcon } from "@heroicons/react/24/solid";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "../../firebase";
import { firestore } from "../../firebase";
import toast from "react-hot-toast"; 


export function PriceAlertButton({ product }) {
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [emailNotification, setEmailNotification] = useState(false);


  const toggleOpen = () => setOpen((o) => !o);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Najprej se prijavi!");
      return;
    }

    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0) {
      toast.error("Vnesi veljavno ciljno ceno.");
      return;
    }

    try {
      const colRef = collection(firestore, "users", user.uid, "priceAlerts");
      await addDoc(colRef, {
        productId: product.id,
        productName: product.name,
        targetPrice: t,
        currentPrice: product.actionPrice ?? product.price,
        createdAt: serverTimestamp(),
        triggered: false,
        notified: false,
        seen: false,
        emailNotification: emailNotification,
      });

      setOpen(false);
      setThreshold("");
      setEmailNotification(false);
      toast.success("Opozorilo za ceno je bilo uspešno nastavljeno!");
    } catch (err) {
      console.error("Napaka pri shranjevanju alarma:", err);
      toast.error("Napaka — poskusi znova.");
    }
  };

  return (
    <>
      <Button
        size="sm"
        color="red"
        variant="outlined"
        className="flex items-center gap-1"
        onClick={toggleOpen}
      >
        <BellIcon className="w-5 h-5" />
        Nastavi alarm
      </Button>

      <Dialog open={open} handler={toggleOpen}>
        <DialogHeader>
          <Typography variant="h6">Obvesti me, ko cena pade pod</Typography>
        </DialogHeader>
        <DialogBody divider className="space-y-4">
          <Input
            type="number"
            label="Ciljna cena (€)"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <Checkbox
            label="Želim prejeti email obvestilo"
            checked={emailNotification}
            onChange={(e) => setEmailNotification(e.target.checked)}
          />

        </DialogBody>
        <DialogFooter className="space-x-2">
          <Button variant="text" onClick={toggleOpen}>
            Prekliči
          </Button>
          <Button onClick={handleSave} disabled={!threshold}>
            Shrani
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

export default PriceAlertButton;